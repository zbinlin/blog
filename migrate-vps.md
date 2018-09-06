# 在 KVM 上安装 CentOS 7 过程记录

最近，由于 [Crissic Solutions](http://www.zrblog.net/15598.html) 关闭了服务，导致我不得不又要去寻找其他便宜点的 VPS 了，刚好
<del datetime="2018-09-06T06:16:39.509Z" title="比较坑，不推荐使用">hostodo</del>
有优惠，有个 KVM 的套餐价格与之前 Crissic 的一样。因此有买了一年。

刚下订单后，服务没立即开通，可能需要审核，等了比较久，于是发了一个 Ticket，在第 2 天登录后，发现已经开通了。购买时机房选洛杉矶的，从广州 ping 了下 time
值只有 160-180ms 左右，已经不错了，之前的 Crissic 基本上在 200ms 以上的。

由于在下订单选择操作系统的时候，选择了 `None (More OS available after provisioned) `，因此在开通后的服务还没有操作系统，需要登录 VPS Control Panel 后自行安装。于是通过它提供的 VPS Control Panel 登录链接以及用户名和密码来登录。

登录到 Control Panel 后，在界面上有个 Reinstall 的按钮，点击之后可以选择你想要
安装的操作系统。

由于之前在 Crissic 上的系统是 CentOS 6 32bit，内核比较旧，而且是 32 位的，使用起来非常不便，因此这次打算安装 CentOS 7 64bit。

由于该套餐的 VPS 的内存只有 512M，开始时还担心 64 位的系统占用内存比较大的，但安装成功后进入系统后看了下，发现只占用 60 多 M，这还可以接受。

在安装后发现了一个问题，整个分区只有 2G，这还需要对剩余的空间进行分区。但由于整个 `/` 分区太小了，而且 VPS 的磁盘空间只有 15G，因此打算只分一个区就行了。

既然只分一个区就只能重装系统了，回到 Control Panel 的主界面，在界面的下面有一个
CDRom 的 tab 页，点击切换过去后，在 Select 下面选择重装的系统 ISO（这里因为安装的是 CentOS 7，所以选择了 CentOS 7 x86_64 Minimal ISO），然后点击 Mount 按钮，在提示 mount 成功后，就可以在本地使用 VNC 客户端连接远程的 VPS，然后重启 VPS，VPS 会引导启动刚才 mount 的 ISO（如果重启后发现依然是引导到旧的系统的，可以在
Control Panel 的主界面下边的 Settings 标签页里，在 Boot Order 里选择 CDROM 优先的选项，然后重启 VPS）。

重装的过程非常缓慢，主要是由于网络的问题，以及安装的界面是一个 GUI 界面，导致
界面响应非常慢。比较搞笑的是，在真正开始安装时，界面上有个设置新账号的选项，
在我还未设置好账号，安装就已经完成了。

安装完成后，由于在安装时未设置 hostname，因此安装后使用：

```
hostnamectl set-hostname <your hostname>
```

来设置 hostname。

之后使用 `yum update` 来更新系统，但发现网络还未配置好（在安装时忘了配置了），于是使用 `nmtui` 命令来配置，该命令是一个 text GUI 界面，使用起来比较简单，因此这里就略过了。

更新成功后，安装 EPEL 和 SCL 源：

```
yum install epel-release centos-release-scl
```

接着安装 `yum-utils`，因为里面有个命令 `yum-complete-transaction` 可以修复在安装包的过程发现中断（比如安装软件时突然关机、死机了）时的 transaction 未完成的问题：

```
yum install yum-utils
```

由于需要使用 GCC 来编译一个 nodejs 的原生模块，因此安装了 `Development Tools`：

```
yum groupinstall "development tools"
```

安装 `iptables-service` 来控制 `iptables` 启用、启动、关闭等控制：

```
yum install iptables-services
```

然后开启以及启动：

```
systemctl enable iptables.service
systemctl enable ip6tables.service
systemctl start iptables.service
systemctl start ip6tables.service
systemctl status iptables.service
systemctl status ip6tables.service
```

现在需要导入新的 iptables 规则，如果不需要旧的规则，可以先清除掉：

```
iptables -t filter -F
```

然后导入：

```
iptables -t filter -A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
iptables -t filter -A INPUT -i lo -j ACCEPT
iptables -t filter -A INPUT -p ICMP --icmp-type echo-request -j ACCEPT
iptables -t filter -A INPUT -p tcp -m tcp --dport 8822 -j ACCEPT
iptables -t filter -A INPUT -p tcp -m tcp --dport 80 -j ACCEPT
iptables -t filter -A INPUT -p tcp -m tcp --dport 443 -j ACCEPT
iptables -t filter -P INPUT DROP
```

对于 ip6tables，也同样地处理：

```
ip6tables -t filter -F
ip6tables -t filter -A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
ip6tables -t filter -A INPUT -i lo -j ACCEPT
ip6tables -t filter -A INPUT -p ICMPv6 --icmp-type echo-request -j ACCEPT
ip6tables -t filter -A INPUT -p tcp -m tcp --dport 8822 -j ACCEPT
ip6tables -t filter -A INPUT -p tcp -m tcp --dport 80 -j ACCEPT
ip6tables -t filter -A INPUT -p tcp -m tcp --dport 443 -j ACCEPT
ip6tables -t filter -P INPUT DROP
```

（注：上面的 8822 端口是用于 ssh 服务的）

添加好后需要导出到 `/etc/sysconfig/iptables` 和 `/etc/sysconfig/ip6tables`，以
便重启后可以加载进来：

```
iptables-save > /etc/sysconfig/iptables
ip6tables-save > /etc/sysconfig/ip6tables
```

上面的操作都是在 VNC 上进行了，下面配置一下 sshd 服务，配好后就可以使用 ssh 来登录操作了。

首先，修改 `/etc/ssh/sshd_config` 配置文件，修改如下：

```
# 修改端口
Port 8822
# 启用公钥登录
PubkeyAuthentication yes
# 禁止空密码登录
PermitEmptyPasswords no
# 禁止密码登录（这一行现在先不改，在将公钥上传后再来修改
# PasswordAuthentication no
```

然后使用 `systemctl restart sshd`，但发现重启失败，原因是由于 selinux 不允许 sshd 使用 8822 端口：

```
grep sshd /var/log/audit/audit.log | audit2why
```

于是使用 semanage 为 sshd 添加 8822 端口：

```
semanage port -a -t ssh_port_t -p tcp 8822
```
（注：如果提示该命令不存在，可以安装 `policycoreutils-python` 包）

配好后，重新启动服务，就可以使用 ssh 来登录了。

在本地使用 `ssh-keygen -t ed25519 -C vps -f ~/.ssh/<filename>` 生成密钥，
然后使用 `ssh-copy-id -i ~/.ssh/<filname>.pub <your vps ip>` 将公钥保存到服务器端。


然后安装 nginx, rh-postgresql95：

```
yum install nginx rh-postgresql95
```

初始化 postgresql95，由于使用 scl 上的 postgresql95，因此需要使用以下命令新开一个 shell 环境来开启 postgresql95：

```
scl enable rh-postgresql95 bash
```

然后在这个新的 bash shell 中初始化：

```
postgresql-setup --initdb
```

PS: 以上两条命令最好在 root 下执行，因为第二条需要 root 权限，而如果使用
`sudo postgresql-setup --initdb` 会报 `command not found` 的错误。


初始化完成后，就可以开启 postgresql95 服务了：

```
systemctl enable rh-postgresql95-postgresql.service
```

然后启动，并查看是否启动成功了：

```
systemctl start rh-postgresql95-postgresql.service
systemctl status rh-postgresql95-postgresql.service
```

当启动成功后，就可以使用 `psql` 管理进行创建数据库，创建用户，导入数据库等操作
了。

如果需要切换到 postgres 账号来登录使用 `psql`，为了避免频繁输入 postgres 的密码，可以修改下 PAM 配置，使得当前账号可以免 postgresql 账户密码切换到 postgres 账号。

编辑 `/etc/pam.d/su` 配置文件，在

```
auth		sufficient	pam_rootok.so
```

一行的下面添加以下配置：

```
auth		[success=ignore default=1] pam_succeed_if.so user in postgres
auth		sufficient	pam_succeed_if.so user = <USER> use_uid
```

其中，把上面的 `<USER>` 替换为当前登录的账号名。如果还要添加其他用户，用户名之间用 `:` 分隔，如：`postgres:other`。

然后就可以使用以下命令进入 psql 里了：

```
su - postgres -c 'scl enable rh-postgresql95 psql'
```
（注：上面的命令是由于需要先启用 rh-postgresql95，psql 命令才可以用）

postgresql 配置好后，现在来开启 nginx 服务：

```
systemctl enable nginx
```

然后启动，并查看启动状态：

```
systemctl start nginx
systemctl status nginx
```

启动成功后，将原 VPS 上的配置文件复制到 `/etc/nginx/conf.d/` 里，由于将 SSL 证书和密钥放在其他目录上，并且 CentOS 7 默认开启了 selinux，因此需要为该目录修改其 label：

```
chcon -v --type=httpd_sys_content_t /srv/ssl
```

上面的命令是临时性的，当修改该目录后，其 label 又会被删除，因此可以使用以下命令永久地使其生效：

```
semanage fcontext -a -t httpd_sys_content_t /srv/ssl(/.*)?
restorecon -Rv /srv/ssl
```

由于需要使用比较新的 Nodejs 版本，因此直接使用 Nodejs 官网提供的[安装方式](https://nodejs.org/en/download/package-manager/)来安装 Nodejs：

```
curl --silent --location https://rpm.nodesource.com/setup_7.x | bash -
yum install nodejs
```

由 nginx 作为前端，后端使用 nodejs 时，在 nginx 连接 nodejs 时如果连接失败，如果在 `/var/log/nginx/error.log` 中发现以下错误：

```
2016/11/16 01:49:33 [crit] 16726#0: *26 connect() to 127.0.0.1:2368 failed (13: Permission denied) while connecting to upstream, client: x.x.x.x, server: example.org, request: "GET / HTTP/1.1", upstream: "http://127.0.0.1:2368/", host: "example.org"
```

这可能是由于 selinux 的 `httpd_can_network_connect` 的值为 `off` 造成的，这时可以使用以下命令修改其值为 `on`：

```
# 可以使用以下命令查看 httpd_can_network_connect 的值：
getsebool -a | grep httpd_can_network_connect
# 将 httpd_can_network_connect 设为 on
setsebool -P httpd_can_network_connect on
```

参考：

https://www.softwarecollections.org/en/scls/rhscl/rh-postgresql95/
https://www.nginx.com/blog/nginx-se-linux-changes-upgrading-rhel-6-6/
