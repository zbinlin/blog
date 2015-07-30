# 在 CentOS 7 中修改 sshd 的端口


1. 编辑 `/etc/ssh/sshd_config`

添加/修改 Port XX 行（把 XX 改成需要设定的端口）

2. 查看防火墙是否开启

        systemctl status firewalld.service

如果开启，需要在防火墙上开放上面的端口：

    # 先查看是否已经添加了
    firewall-cmd --zone=public --list-port

    # 如果添加了该端口，可忽略这条命令。把 XX 改成实际需要修改的端口
    firewall-cmd --zone=public --add-port=XX/tcp --permanent

    # 重新加载
    firewall-cmd --reload

3. 查看 SELinux 是否开启

        sestatus -v

如果显示 disabled 则表示 SELinux 已经关闭，可略过本步骤。

如果需要关闭 SELinux，可以编辑 `/etc/selinux/config`：

把 `SELINUX=enforcing` 这一行改成：

    SELINUX=disabled

然后重启，可再次输入 `sestatus -v` 来查看是否已经关闭了。

如果不想关闭 SELinux，可以在 SELinux 中允许上面设定的 sshd 端口：

要修改 SELinux 的设置，需要使用 `semanage` 命令，而系统本身默认没有安装，可以通过 `yum provides semanage` 来查看哪个包提供该命令。
从该命令可知是由 `policycoreutils-python` 这个包来提供，然后安装该包：

    yum install policycoreutils-python

安装好该包后，可以通过下面的命令查看目前 sshd 在 SELinux 中的端口：

    semanage port -l | grep ssh

一般会显示：

    ssh_port_t tcp 22

这时，我们可以把 port 添加到 SELinux 的 **ssh_port_t** 中：

    semanage port -a -t ssh_port_t -p tcp XX

之后再次运行 `semange port -l | grep ssh` 就可以看到刚才添加的 port 了。

4. 现在我们重启 sshd 就可以看到新的 port 生效了。

        systemctl restart sshd.service
        systemctl status sshd.service

PS: 如果 SELinux 是开启状态，并且未把端口添加到 SELinux 中就重启 sshd，则在 `systemctl status sshd.service` 中显示启动 sshd 失败，提示 `(code=exited, status=255)`。
在 `journalctl -u sshd.service` 中显示 `error: Bind to port xxxx on 0.0.0.0 failed: Permission denied.`
