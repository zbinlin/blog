# 捕获 Virtualbox 虚拟机的网络流量


本文使用 wireshark 进行抓包（或查看），操作系统为 ArchLinux。

除了最后一个方案，本文的其他方案都需要一个 [TAP][TUN/TAP]，最终使用 wireshark 来捕获 Virtualbox 的流量也是使用这个接口的。
以下是创建一个名为 *tap0* 的 tap：

    # ip tuntap add dev tap0 mode tap user ${USER}
    $ ip tuntap show
>tap0: tap UNKNOWN_FLAGS:800 user 1000

    # ip link set dev tap0 up


## 方案一：使用 bridge

该方案不支持出口网络（需要桥接的可以连接外网）的网卡是无线网卡。在这里假定该网卡名为 *eth0*（可以通过 `ip link show` 来查看）。

1. 创建虚拟网桥 *br0*

 创建

 ```shell
 # ip link add dev br0 type bridge
 ```

 启动

 ```shell
 # ip link set dev br0 up
 ```

 查看

 ```shell
 $ ip link show br0
 ```
 >5: br0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN mode DEFAULT group default
 >    link/ether 4a:7b:08:56:02:8d brd ff:ff:ff:ff:ff:ff

2. 将 *eth0* 添加到网桥 *br0* 上

 ```shell
 # ip link set dev eth0 master br0
 ```

3. 将 *tap0* 添加到网桥 *br0* 上

 ```shell
 # ip link set dev tap0 master br0
 ```

4. 更改 Virtualbox 虚拟机（假定该虚拟机为 *vm1*）网卡（假定为 *NIC 1*，即序号为 1）的**连接方式**为*桥接网卡*（*Bridged Adapter*），
 **界面名称**为 *tap0*：

 ```shell
 $ VBoxManage modifyvm vm1 --nic1 bridged
 $ VBoxManage modifyvm vm1 --bridgeadapter1 tap0
 ```

5. 使用 DHCP 为 *br0* 分配 ip

 如果 *eth0* 已经 DHCP 分配了 ip，先清空它（如果 *eth0* 有 dhcp client daemon，要 kill 掉它）

 ```shell
 # ip addr flush dev eth0
 ```

 如果 *eth0* 还没启动，则启动它

 ```shell
 # ip link set dev eth0 up
 ```

 然后为 *br0* 分配 ip

 ```shell
 # dhcpcd br0
 ```

然后使用 wireshark 捕获 tap0 接口的流量就可以了。


### 方案二：使用 static route

该方案不适用于出口网卡直连 Internet（即该网卡的 IP 是公网 IP），一般用在网卡连接路由器的情况下，并且还需要在路由器上设置路由。
这里假定该网卡接口名为 *wlan0*，获取到路由器分配的 IP 为 *192.168.1.10/24*


1. 为 *tap0* 分配的 IP 为：192.168.2.1/24

 ```shell
 # ip addr add 192.168.2.1/24 scope link dev tap0
 ```

2. 配置 192.168.2.0/24 的 DHCP 服务器

 这里使用 *dhcpd* 作为 DHCP 服务器，因此需要安装 *dhcp* 包

 ```shell
 # pacman -S dhcp
 ```

 然后编辑 `/etc/dhcpd.conf` 文件，加入以下代码：

 ```dhcpd.conf
 subnet 192.168.2.0 netmask 255.255.255.0 {
     range 192.168.2.2 192.168.2.102;
     option domain-name "example.org";
     option domain-name-servers 8.8.8.8, 8.8.4.4;
     option routers 192.168.2.1;
     option broadcast-address 192.168.2.255;

     default-lease-time 1800;
     max-lease-time 7200;
 }
 ```

3. 打开相关的内核参数

 ```shell
 # echo '1' > /proc/sys/net/ipv4/ip_forward
 # echo '1' > /proc/sys/net/ipv4/conf/wlan0/proxy_arp
 # echo '1' > /proc/sys/net/ipv4/conf/tap0/proxy_arp
 ```

4. 在路由器上设置路由，这里假定 *wlan0* 连接到路由器上的接口是 *br-lan*

 ```shell
 # ip route add 192.168.2.0/24 via 192.168.1.10 dev br-lan
 ```

5. 开启 dhcp 服务器

 ```shell
 # dhcpd -f -d tap0
 ```

6. 更改 Virtualbox 虚拟机（假定该虚拟机为 *vm1*）网卡（假定为 *NIC 1*，即序号为 1）的**连接方式**为*桥接网卡*（*Bridged Adapter*），
**界面名称**为 *tap0*：

 ```shell
 $ VBoxManage modifyvm vm1 --nic1 bridged
 $ VBoxManage modifyvm vm1 --bridgeadapter1 tap0
 ```

然后使用 wireshark 捕获 tap0 接口的流量就可以了。


### 方案三：使用 nat

方案二使用了静态路由来转发来自 tap0 的数据，可以使得路由器中的所有机器都可以访问 Virtualbox 虚拟机，但设置起来比较麻烦。
如果不需要这个功能的，我们可以使用 NAT 来进行数据转发，这样设置起来就没那么麻烦了（不需要知道 *wlan0* 的 ip，也不需要在路由器上设置路由）。

我们只需要将方案二中的第 4 步改成以下操作就可以了：

查看 iptables 是否开启了：

```shell
# systemctl status iptables.service
```

如果没开启，需要先开启它：

```shell
# systemctl start iptables.service
```

然后使用 iptables 的添加 SNAT 规则：

```shell
iptables -t nat -A POSTROUTING -o wlan0 -s 192.168.2.0/24 -j MASQUERADE
```

还有一个方案与上面第二、三的方案类似，这里给出[链接][bridge-wireless-cards]，有兴趣的朋友可以去看下。

以上三种方案都有不同的优点跟缺点，但它们都有一个共同的缺点，那就是配置起来比较麻烦。
方案的最后，给出一个相对简单的方案： Virtualbox 本身已经自带的抓包功能了<sup>[[1]](#cite-1)</sup>。


## 方案四：使用 virtualbox 自带的抓包功能

1. 创建一个 named pipe 文件，当然也可以不用建（使用普通文件保存）

 ```shell
 $ mkfifo /tmp/file.pcap
 ```

2. 设置 Virtualbox 的 nictrace

 ```shell
 $ VBoxManage modifyvm vm1 --nictrace1 on --nictracefile1 /tmp/file.pcap
 ```

3. 启动 wireshark<sup>[[2]](#cite-2)[[3]](#cite-3)</sup>

 ```shell
 $ wireshark -k -i /tmp/file.pcap &
 ```

4. 启动 Virtualbox 虚拟机

 ```shell
 $ VBoxManage startvm vm1 --type gui
 ```

抓取结束后，需要做些扫尾工作：

1. 停止 Virtualbox 的 nictrace

 ```shell
 $ VBoxManage modifyvm vm1 --nictrace1 off
 ```

2. 关闭 named pipe 文件

 ```shell
 $ rm /tmp/file.pcap
 ```


参考：

1. <cite id="cite-1">[Network_tips – Oracle VM VirtualBox](https://www.virtualbox.org/wiki/Network_tips "Network_tips – Oracle VM VirtualBox")</cite>

2. <cite id="cite-2">[CaptureSetup/Pipes - The Wireshark Wiki](https://wiki.wireshark.org/CaptureSetup/Pipes "CaptureSetup/Pipes - The Wireshark Wiki")</cite>

3. <cite id="cite-3">[Wireshark 抓远程主机的包](http://lilydjwg.is-programmer.com/2015/6/1/wireshark-capturing-over-ssh.95147.html "Wireshark 抓远程主机的包")</cite>



[bridge-wireless-cards]: http://blog.bodhizazen.net/linux/bridge-wireless-cards/ "Bridge wireless cards | Shadows of epiphany"
[TUN/TAP]: https://en.wikipedia.org/wiki/TUN/TAP "TUN/TAP - Wikipedia, the free encyclopedia"
