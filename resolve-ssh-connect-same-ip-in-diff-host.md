# 使用 ssh 连接相同 ip 不同主机时的 fingerprint 冲突问题

最近将家里的路由器刷了 openwrt，当使用 ssh 连接路由器时，提示：

```
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!
Someone could be eavesdropping on you right now (man-in-the-middle attack)!
It is also possible that a host key has just been changed.
The fingerprint for the RSA key sent by the remote host is
SHA256:............................................
Please contact your system administrator.
Add correct host key in /home/example/.ssh/known_hosts to get rid of this message.
Offending RSA key in /home/example/.ssh/known_hosts:1
RSA host key for 192.168.1.1 has changed and you have requested strict checking.
Host key verification failed.
```

这是由于之前在出租的房子里路由器同样是 openwrt，而且已经登录过并保存了该路由器的 RSA key fingerprint，导致与现在连接的路由器的 RSA key fingerprint 不匹配而冲突了。

最简单的解决方式是将之前的 fingerprint 从 `~/.ssh/known_hosts` 里删除，但这样如果连接原来的路由器又会出现冲突。

这里可以在使用 ssh 连接时使用 `-o 'UserKnownHostsFile /dev/null'` 临时解决。

另外可以通过分别为不同的 host（这里是路由器）设置 `HostKeyAlias` 参数来区分开来，例如：

在连接出租屋里的路由器时，可以使用 `ssh -o 'HostKeyAlias host1' root@192.168.1.1` 连接，

在连接家里的路由器时，使用 `ssh -o 'HostKeyAlias host2' root@192.168.1.1` 连接。

但这样每次连接都需要添加这么长的参数，显得很麻烦，这时可以通过将参数添加到 `~/.ssh/config` 里解决：

```
Host host1
    Hostname 192.168.1.1
    HostKeyAlias host1
    Port 22
    User root

Host host2
    Hostname 192.168.1.1
    HostKeyAlias host2
    Port 22
    User root
```

这样，就可以分别使用 `ssh host1` 和 `ssh host2` 来连接了。
