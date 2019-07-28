# 通过 ssh 命令临时地使用 Android 作为 SOCKS 4/5 服务器

最近需要在一台 Linux 的 PC 上访问 Wikipedia，但不好在这台电脑上安装一些软件。刚 
好自己的手机开启了 VPN 可以正常访问到 Wikipedia。然后无意间在浏览 ssh man page 
时，看到可以在 Android 机上使用 ssh 的 `-R [bind_address:]port` 选项来开启一个 
SOCKS5。这样一来，似乎就可以在 PC 上通过 SOCKS5 转发请求到 Android 机上，然后 
再通过 Android 开启 VPN 来访问 Wikipedia 了。经过测试，可以正常工作，以下是折腾 
过程。

PC 上确保已经开启了 sshd 了：

```bash
systemctl status sshd.service
```

Android 上，首先需要在 Android 安装一个 `termux` 的终端模拟器，这个可以通过 
F-droid 或 Google Play Store 来安装。

然后打开 `Termux` 进入 Termux 命令行内，输入以下命令来安装 `ssh` 客户端：

```bash
pkg install openssh
```

安装成功后，就可以通过以下命令来连接到 Linux 的 PC 机上，并为 PC 机开启一个 
SOCKS5 服务器，这样在 PC 机上就可以连接这个 SOCKS5 服务器了：

```bash
ssh -CNTR localhost:8080 {USER}@{HOST}
```

其中 `{USER}` 为 PC 机上的用户名，`{HOST}` 为 PC 机的 IP 地址。

连接上后，开启 Android 的 VPN，然后就可以在 PC 机上使用 `socks5://localhost:8080` 了。

*NOTES:*

* 如果 Android 机上安装了 `AFWall+` 等防火墙应用，需要开启 Termux 可以通过 VPN。
* 如果想使用随机端口，可以把 `8080` 改成 `0`，连接后会在终端显示分配的端口号。
* 默认绑定到 `127.0.0.1` 和 `[::1]`，如果想绑定其他地址，可以加上指定的 IP 地址。
* 可能会由于手机熄屏而导致连接中断，这时，可以在手机的通知栏 `Termux` 下点击 `ACQUIRE WAKE LOCK`。
