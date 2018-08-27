# 在 CentOS 中安装 postgresql

## 安装

1. 配置 YUM 仓库，编辑 `/etc/yum.repos.d/Centos-Base.repo` 中的 `[base]` 和 `[updates]` 部分，在这两部分中添加以下行：

        exclude=postgresql*

2. 安装 PGDG RPM 文件，在 [http://yum.postgresql.org]() 中查找你需要安装的相应版本的链接，然后运行以下命令安装：

        yum localinstall https://download.postgresql.org/pub/repos/yum/9.5/redhat/rhel-6-i386/pgdg-centos95-9.5-2.noarch.rpm

3. 安装 Postgresql

   列出可用的包：

        yum list postgres*

   安装：

        yum install postgresql95-server postgresql95


## 配置

### 数据文件夹

PostgreSQL 数据文件夹包含了数据库所需的所有数据文件。变量 PGDATA 指向该文件夹。
在 PostgreSQL 9.0 及以上版本，默认的数据文件夹在：
```
/var/lib/pgsql/<name>/data
```

如 PostgreSQL 9.5 中：
```
/var/lib/pgsql/9.5/data
```

其他版本（7.x、8.x）中，默认在：
```
/var/lib/pgsql/data/
```


### 初始化

使用以下命令（只需执行一次）初始化数据库：
```shell
service <name> initdb
```

例如（v9.5）：
```shell
service postgresql-9.5 initdb
```

如果上面的命令无法工作，可以尝试直接执行安装程序：
```shell
/usr/pgsql-y.x/bin/postgresqlyx-setup initdb
```

例如（v9.4）：
```shell
/usr/pgsql-9.4/bin/postgresql94-setup initdb
```

注：postgresql 9.5 的 bin 目录里没有 postgresql95-setup，可以使用以下命令：
```shell
su - postgres -c '/usr/pgsql-9.5/bin/initdb -D /var/lib/pgsql/9.5/data'
```

如果需要指定编码，可以使用
```shell
su - postgres -c '/usr/pgsql-9.5/bin/initdb -D /var/lib/pgsql/9.5/data -E UTF8 --locale=en_US.UTF8'
```

或根据 LANG 来设置
```shell
su - postgres -c 'LANG=en_US.UTF8 /usr/pgsql-9.5/bin/initdb -D /var/lib/pgsql/9.5/data'
```

### 启动

如果你想在操作系统启动时自动启动，可以运行以下命令：
```shell
chkconfig <name> on
```

例如（v9.5）：
```
chkconfig postgresql-9.5 on
```

PS：如果你的系统里有 systemd，需要使用 `systemctl` 来开启：
```
systemctl enable postgresql
```

### 控制服务

如果需要控制数据库服务，可以使用：
```shell
service <name> <command>
```

其中，*<command>*：
* start: 启动该数据库
* stop: 停止该数据库
* restart: 重启该数据库，一般用于使配置文件改变后重新生效
* reload: 重新读取 pg_hba.conf 文件（不停止该数据库的运行）

例如，启动 v9.5：
```shell
service postgresql-9.5 start
```

如果使用 systemd，使用以下命令替代：

```shell
systemctl enable postgresql-9.5.service
systemctl start postgresql-9.5.service
systemctl reload postgresql-9.5.service
systemctl reload-or-restart postgresql-9.5.service
systemctl restart postgresql-9.5.service
```

## 卸载

全部卸载：
```shell
yum erase postgresql95*
```


翻译(不完整）自：[https://wiki.postgresql.org/wiki/YUM_Installation]()