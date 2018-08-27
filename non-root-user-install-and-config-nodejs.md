#非 root 用户安装和配置 NodeJS

本文主要针对 Linux 非 root 用户，在没有 root 权限下如果安装及配置 NodeJS（注：这里安装的是官网上已经编译好的二进制包）。

首先到 NodeJS 的官网（[https://nodejs.org/en/download/]()）下载对应的已经编译好的
二进制包。

这里以 CentOS 6 32bit 为例，安装 NodeJS 的 LTS 版本：

1. 下载 Linux Binaries 32bit 版本：

        curl -o node-v4.4.2-linux-x86.tar.xz https://nodejs.org/dist/v4.4.2/node-v4.4.2-linux-x86.tar.xz

2. 将下载好的二进制压缩包解压至指定的安装目录（这里以 `~/apps` 为例）：

        mkdir -p ~/apps
        tar -xJf node-v4.4.2-linux-x86.tar.xz --no-wildcards-match-slash --anchored \
            --exclude */CHANGELOG.md --exclude */LICENSE --exclude */README.md \
            --strip 1 -C ~/apps
   注：如果出错并提示 `xz: Cannot exec: No such file or directory`，可能是未安装 `xz` 解压工具。这里，你可以
   重新下载 gzip 格式的压缩包（[https://nodejs.org/dist/v4.4.2/node-v4.4.2-linux-x86.tar.gz]()），然后将上面
   命令中的 `-xJf` 换成 `-xzf`。

3. 编辑 `~/.bash_profile` 或者 `~/.profile`，将 `~/apps/bin` 添加到环境变量 `PATH` 中：

        export PATH="${PATH}:${HOME}/apps/bin"
   注1：如果配置文件中已经有了 PATH 变量，可以在其后面添加 `${HOME}/apps/bin`。
   注2：如果系统里已经安装了其他版本的 node，可以将 `${HOME}/apps/bin` 放在 `${PATH}` 的前面，防止使用系统使用的版本，而不是需要安装的版本

4. 现在可以使用 `source ~/.bash_profile` 或 `source ~/.profile`（如果修改的是这个配置文件），使上面的修改生效。
   这时，键入 `node -v` 如果可以看到刚刚安装的 node 的版本号，表明已经安装成功了。


5. 配置 npm，在 shell 中执行以下命令（如果输入 `npm -v` 可以看到 npm 的版本号，该步骤可忽略）：

        mkdir -p ~/apps/etc
        echo 'prefix = ${HOME}/apps' > ~/apps/etc/npmrc

题外：

如果系统已经安装了 NodeJS，在使用 npm -g 时，又不想使用 root 权限将 package 安装到 /usr 下面，可以通过配置 `npmrc` 到当前用户下。
以安装到 `~/.npm_packages` 下为例：

首先将以下内容添加到 `~/.npmrc` 下：
```shell
echo 'prefix = ${HOME}/.npm_packages' > ~/.npmrc
```

然后将 `${HOME}/.npm_packages/bin` 添加到环境变量 `PATH` 里（添加方法见上文），当环境变量更新后，就可以使用 `npm -g install <package>` 将
package 安装到 `~/.npm_packages/lib` 下面了。

另外这里提供一个 bash 脚本，可用于更新 NodeJS：

```bash
#!/usr/bin/env bash

if [[ -z "$1" ]]
then
    echo "Usage: ./update-node-js.sh <NODE_VERSION> [INSTALL_DIR]"
    echo "Example: ./update-node-js.sh v5.10.1 ~/apps"
    exit 1
fi

if [[ -z "$2" ]]
then
    dir=~/apps
else
    dir=$2
fi

version=$1
arch=$(uname -m)
if [[ $arch == 'i686' || $arch == 'x86_64' ]]
then
    arch='x64'
else
    arch='x86'
fi

shasum256_file=https://nodejs.org/dist/${version}/SHASUMS256.txt
url=https://nodejs.org/dist/${version}/node-${version}-linux-${arch}.tar.gz

shasum256_filename=$(basename $shasum256_file)
nodejs_filename=$(basename $url)

function cleanup {
    cd $ori
    rm -rf $tmp
}

ori=$(pwd)
tmp=$(mktemp -d)
echo "Mkdir ${tmp}..."
trap cleanup EXIT
echo "Enter ${tmp}..."
cd $tmp

echo "Downloading..."
curl -L $shasum256_file -o $shasum256_filename
curl -L $url -o $nodejs_filename
echo "Downloaded!"

echo "Verifying ${nodejs_filename}..."
grep $(sha256sum $nodejs_filename) $shasum256_filename 2>&1 1>/dev/null

if [[ $? != 0 ]]
then
    echo "Verify $nodejs_filename fail!"
    exit 1
fi
echo "Verify $nodejs_filename success!"

echo "Installing..."
dir=~zhcp/tmp/ff
tar -xzf $nodejs_filename --no-wildcards-match-slash --anchored \
    --exclude */CHANGELOG.md --exclude */LICENSE --exclude */README.md \
    --strip 1 -C $dir
echo "Install success!"
```
