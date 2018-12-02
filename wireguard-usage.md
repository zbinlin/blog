# WireGuard 配置和上网流量优化

本文涉及到 WireGuard 的使用介绍、国内外流量的分流等内容

## WireGuard 安装

在使用 WireGuard 之前，需要分别在服务器和本地安装。

由于本人的服务器上使用 debian 9、本地使用 Arch Linux，因此这里只给出这两种系统上的安装方式，其他系统上的安装可以在[官网](https://www.wireguard.com/install/)找到。

### Debian

```bash
echo "deb http://deb.debian.org/debian/ unstable main" > /etc/apt/sources.list.d/unstable.list
printf 'Package: *\nPin: release a=unstable\nPin-Priority: 150\n' > /etc/apt/preferences.d/limit-unstable
apt update
apt install wireguard
```

### Arch Linux

```bash
pacman -S wireguard-dkms wireguard-tools
```


## WireGuard 配置

WireGuard 的配置分为 Interface 和 Peer，其中 Interface 可以认为是对本地机器的配置，而 Peer 是配置连进来的机器的

在服务器和本地的大部分配置是一样的，先添加一个接口：

```bash
ip link add wg0 type wireguard
```

如果报错，并提示 **RTNETLINK answers: Operation not supported**，先检查下 wireguard 模块是否已经加载：

```
lsmod | grep wireguard
```

如果没有加载，试下执行 `modprobe wireguard`，如果报错，重启下机器。

在服务器端为 wg0 添加一个地址 `192.168.128.1/24`

```bash
ip addr add 192.168.128.1/24 dev wg0
```

同样在本地为 wg0 添加另一个地址 `192.168.128.254/24`
```bash
ip addr add 192.168.128.254/24 dev wg0
```

然后分别在服务器和本地添加 private key

```bash
wg set wg0 private-key <(wg genkey)
```

如果是要用 `sudo` 来执行的，需要使用以下命令：

```bash
sudo bash -c 'wg set wg0 private-key <(wg genkey)'
```

为服务器添加一个监听端口，本地使用随机端口就行了，不需要固定端口：

```bash
wg set wg0 listen-port 12345
```

以上是 Interface 的设置，下面配置 Peer。

首先在服务器上加入本地的 Peer：

需要添加本地的公钥，可以在本地通过以下命令获取：

```bash
wg show wg0 public-key
```

获取到公钥后，还要获取本地 wg0 上的 IP 地址（192.168.128.254）加入到 perr 的 AllowIPs 里：

```bash
wg set wg0 peer '<本地的公钥>' allowed-ips <本地 wg0 上设置的 IP 地址，如 192.168.128.254/32>
```

同样，把服务器上的公钥加入本地，这里要把服务器的外网 ip 作为 endpoint，这里以 `wireguard.example.org` 为例，要不本地就不知道连那台服务器了：

```bash
wg set wg0 peer '<服务器上的公钥>' allowed-ips 0.0.0.0/0 endpoint wireguard.example.org:12345
```

注：这里 allowed-ips 使用 0.0.0.0/0，这样相当于 wireguard 全局生效。

现在 wireguard 的配置基本配好了，可以通过以下命令来启动：

```bash
ip link set dev wg0 up
```

启动 wg0 接口，这时可以 ping 下服务器端的地址 `ping 192.168.128.1`，如果 ping 通说明 wireguard 正常工作了。
如果 ping 不通，检查下对方的公钥及 ip 地址是否正确了。

现在本地跟服务器已经在同一个内网上，可以彼此通信了。
但本地现在是无法通过服务器连接到外面的网络，如果需要通过服务器连接到外面的网络，要在服务器上设置流量转发和 NAT 才可以。

### 转发与 NAT

首先，检查下 ip 转发是否已开启：

```bash
sysctl net.ipv4.ip_forward
```

如果等于 1 说明已经开启，否则可以使用：

```bash
sysctl net.ipv4.ip_forward=1
```

来临时开启，如果想永久生效，需要编辑 `/etc/sysctl.conf` 文件，查找到 `net.ipv4.ip_forward` 这一行，把最前端的 **#** 号（注释）去掉，如果其值不为 1 的，改成 1。如果找不到，就把 `net.ipv4.ip_forward=1` 加在文件最下面。

然后使用命令 `sysctl -p` 来使其生效。

接下来检查下 iptables 里 *filter* 表的 *FORWARD* 链的 policy 是否为 *ACCEPT*：

```bash
iptables -t filter -L FORWARD
```

如果 policy 为 *DROP*，需要允许 `wg0` 接口才行：

```bash
iptables -t filter -A FORWARD -i wg0 -j ACCEPT
iptables -t filter -A FORWARD -o wg0 -m state --state RELATED,ESTABLISHED -j ACCEPT
```

然后看下 *nat* 表的 *POSTROUTING* 链里是否已经做了出口的 NAT 了（这里假设服务器上连接外网的接口是 *eth0*）：

```bash
iptables -t nat -L POSTROUTING -v
```

如果还没有，使用以下命令加上：

```bash
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
```

PS：如果出口不是 *eth0* 接口的，把 *eth0* 换成正真的出口接口

在服务器设置好后，还要在本地加上路由，把流量转发到 wg0 接口上。

### 本地路由

```bash
ip route add <endpoint>/32 via <出口接口的网关IP> dev <出口接口>
ip route add default via 192.168.128.1 dev wg0 src 192.168.128.254
```

配置好后，可以在本地 ping 下 *8.8.8.8*，如果 ping 的通，并且 `tracepath 8.8.8.8` 的路由里有 *192.168.128.1*，说明已经通了。

## wg-quick

通过这样配置后就可以使用 WireGuard 作为 VPN 上网了，但当前配置会在重启后失效。

如果每次重启都手动配置的话，比较麻烦。还好，WireGuard 提供了 `wg-quick` 命令，该命令可以读取和保存配置文件。

并且 `wg-quick` 也提供也 systemctl 的服务配置，这样可以设置开机自启动。

`wg-quick` 默认的配置目录为 `/etc/wireguard`，文件以 wireguard 的接口名（如上文中的 *wg0*）为文件名，文件名后缀为 `.conf`。

以下分别是服务器和本地的配置文件，保存到 `/ett/wireguard/wg0.conf`：

服务器：

```ini
[Interface]
Address = <服务器上设定 wg0 接口的地址，如：192.168.128.1/24>
PrivateKey = <使用 `wg genkey` 生成的私钥>
ListenPort = <服务器上 wg0 监听的端口，如：1234>

[Peer]
PublicKey = <本地的公钥，可以使用 `echo <本地私钥> | wg pubkey` 生成>
AllowedIPs = <本地 wg0 接口上的地址，如：192.168.128.254/32>
```

本地：

```ini
[Interface]
Address = <本地设定 wg0 接口的地址，如：192.168.128.254/24>
PrivateKey = <使用 `wg genkey` 生成的私钥>

[Peer]
PublicKey = <服务器的公钥，可以使用 `echo <服务器私钥> | wg pubkey` 生成>
AllowedIPs = 0.0.0.0/0
Endpoint = <服务器外网地址:服务器上 wg0 监听的端口，如：0.1.2.3:1234>
```

配置好后，可以使用 `wg-quick up wg0` 来启动（注意，如果你按照了上面 [WireGuard 配置](#WireGuard 配置) 命令手动配置过，需要先删除 wg0 接口和对应的路由才行）。
如果测试没问题后，可以使用 `systemctl enable wg-quick@wg0.service` 来设置开机自启动。

## 优化国内外流量

通过上面设置好后，虽然可以通过 WireGuard VPN 上网了，但有个问题，这个 VPN 是全局性的，即所有的流量都会从 VPN 里出去。
如果服务器在美国的话，在上国内的网站时，会绕了一圈，延时非常大。这时，我们可以通过策略路由的方式，分流国内外的流量，使国内的流量不用走 VPN。

在上面通过 `wg-quick` 启动过，如果本地配置里 `AllowedIPs` 设置了 `0.0.0.0/0`，意思是全局生效，其主要也是通过策略路由来实现的。

下面是 `wg-quick` 启动时的日志：

```
[#] ip link add wg0 type wireguard
[#] wg setconf wg0 /dev/fd/63
[#] ip address add 192.168.128.254/24 dev wg0
[#] ip link set mtu 1420 dev wg0
[#] ip link set wg0 up
[#] wg set wg0 fwmark 51820
[#] ip -4 route add 0.0.0.0/0 dev wg0 table 51820
[#] ip -4 rule add not fwmark 51820 table 51820
[#] ip -4 rule add table main suppress_prefixlength 0
```

以上的日志信息可以看出是条条命令来的，通过这些命令，大概可以猜得出 `wg-quick` 是如何启动的：

首先使用 `ip link add wg0 type wireguard` 添加一个名为 `wg0`、类型为 `wireguard` 的虚拟接口；

然后通过 `wg setconf wg0 /dev/fd/63` 加载配置，从 `/dev/fd/63` 可以看到，配置应该是通过 process substitution 的方式加载进来的；

`ip address add 192.168.128.254/24 dev wg0` 这条命令上面也提到过，就是为 `wg0` 接口添加一个 IP 地址的；

`ip link set mtu 1420 dev wg0` 设置 `wg0` 接口上的 IP 包的 mtu 值；

`ip link set wg0 up` 启动 `wg0` 接口

`wg set wg0 fwmark 51820` 为 `wg0` 接口上的包添加一个 fwmark 值，主要为了下面命令里策略路由用的；

`ip -4 route add 0.0.0.0/0 dev wg0 table 51820` 为一个 id 为 `51820` 表添加默认的路由，该路由的通过 `wg0` 接口

`ip -4 rule add not fwmark 51820 table 51820` 这条命令就是主要的策略路由，通过以上三条命令就可以实现全局的流量转发了。

由于策略路由是有优先级的，所以我们可以在把所有国内的 IP 段添加到优先于上面的这条策略路由，这样就可以不用经过 `wg0` 接口了。

首先要获取到国内的 IP 段，可以通过到 [apnic](http://ftp.apnic.net/stats/apnic/delegated-apnic-latest) 查询到国内的 IPv4 地址段。

该页面里的 IPv4 格式是：起始地址|地址数量，但 `ip rule` 要求 CIDR 格式格式，所以需要转换下。转换起来也挺简单，这里地址数量都是 2 的 n 次方，因此对其以 2 为底求地址数量的对数，然后用 32 减去其对数就可以了。

例如：

>>> apnic|CN|ipv4|45.249.112.0|1024|20160511|allocated

起始地址是 *45.249.112.0*，数量是 1024，即 2^10，因此可转换成 CIDR 格式是：*45.249.112.0/22*，加入到策略路由就是：

```bash
ip rule add to 45.249.112.0/22 priority 1024
```
**priority 1024** 就是设置优先级的，数字小的优先级高

apnic 里的分配给国内的 IP 段比较分散，我统计了下，大概有 8 千多行。我们不可能手动添加的，因此我写了一个 [Node.js 脚本](https://github.com/zbinlin/wireguard-configuration/blob/master/cn.js) 来下载 apnic 的最新分配版，然后转换下，可以导出成一个 shell 脚本来运行， shell 脚本里就是一条条上面的那种命令了。

虽然运行 shell 脚本后，把规则添加到策略路由里了，但这些路由规则也是运行时生效的，下次重启电脑后需要重新加载。这里可没有现成的自启动脚本，难道还要写个自启动脚本吗？

还好 `wg-quick` 里提供了相应的钩子，可以在 `wg-quick` 启动、关闭时执行一条 shell 命令，这样我们就可以把上面的 shell 脚本添加到 `wg-quick` 的配置文件里去了。这样就不详细写了，具体可以看[这里](https://github.com/zbinlin/wireguard-configuration/blob/master/wg0.conf)的示例。

这里有个问题，由于 shell 脚本里的命令太多了，执行起来需要几秒的时间。

这里有个方案，就是先导入 shell 脚本一遍，然后使用 `ip rule save` 导出保存，在 `wg-quick` 里通过 `ip rule restore` 还原配置就可以了，这样速度很多，基本不用 1 秒就可以了。

但是在用 `ip rule save` 导出时，会把所有的规则都导出来了，包含了系统默认的和 `wg-quick` 添加的。再导入时，会出现规则重复或混乱的情况。至于怎么解决，这里就不展开说了，有兴趣的可以去研究下。


## “智能” DNS

下面说下另一个问题。

众所周知，在国内，有些域名已经被污染了，使用运营商提示的 DNS 服务器解析出来的是不对的 IP。因此我们需要一个安全的 DNS 服务器，CloudFlare 就提供这么一组 DNS 服务器，其提供的 *1.1.1.1* 和 *1.0.0.1* 支持 DNS-over-TLS，可以有效的防止被中间人拦击污染。

但有个问题，在我这里访问 `1.1.1.1` 比较慢，`ping 1.1.1.1` 显示有 150ms 左右，如果所有的域名都通过 `1.1.1.1` 来解析的话，一些未被污染的域名访问起来会受到影响。

还好有网友维护了一个 ChinaGFW 的列表，里面包含了被污染的域名，刚好我本地已经搭建了 unbound 域名服务器，而且 unbound 支持 DNS-over-TLS，这样就可以把被污染的域名加入到 unbound 的规则里，把这些域名通过 `1.1.1.1` 来解析，其他域名还是走运营商提示的 DNS 来解析。

[这里](https://github.com/zbinlin/wireguard-configuration/blob/master/dns-over-tls.conf) 是一个 unbound 配置文件，里面包含的被污染的域名从 ChinaGFW 里转出来的，里面的内容类似：

```
forward-zone:
    name: 'google.com'
	 forward-addr: 1.1.1.1@853
	 forward-addr: 1.0.0.1@853
	 forward-ssl-upstream: yes
```

*name* 表示被污染的域名，*forward-addr* 表示向上一级查询的 DNS 服务器，可以有多个，*forward-ssl-upstream* 表示开启 DNS over TLS 功能。
配置文件的最后使用

这是一个独立的配置文件，可以把它放到 `/etc/unbound/` 下，然后在 `/etc/unbound/unbound.conf` 配置文件里加入 `include: /etc/unbound/dns-over-tls.conf` 来引入它。

加入后重启 unbound 服务就可以生效了。
