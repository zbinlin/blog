# 使用 GnuPG(OpenPGP) ECC(ed25519/ecc25519) 密钥作为 ssh 登录密钥

> 本文的操作在 Arch Linux 下进行，没有在其他 Linux 发行版下测试过，因此无法保证其他的 Linux 发行版也可以正常工作。

## 首先生成相应的公私钥

### 生成主密钥

```shell
gpg --full-gen-key --expert
```

PS: 这里因为要生成 ECC 类型的密钥，因此需要使用 `expert` 模式才可以

>
>Please select what kind of key you want:
>   (1) RSA and RSA (default)
>   (2) DSA and Elgamal
>   (3) DSA (sign only)
>   (4) RSA (sign only)
>   (7) DSA (set your own capabilities)
>   (8) RSA (set your own capabilities)
>   (9) ECC and ECC
>  (10) ECC (sign only)
>  (11) ECC (set your own capabilities)
>  (13) Existing key
>Your selection? 10
>

主密钥，这里选择 `(10) ECC (sign only)`。

>
>Please select which elliptic curve you want:
>   (1) Curve 25519
>   (3) NIST P-256
>   (4) NIST P-384
>   (5) NIST P-521
>   (6) Brainpool P-256
>   (7) Brainpool P-384
>   (8) Brainpool P-512
>   (9) secp256k1
>Your selection? 1
>

选择 EC 曲线，这里选择 `(1) Curve 25519`。

>
>Please specify how long the key should be valid.
>         0 = key does not expire
>      <n>  = key expires in n days
>      <n>w = key expires in n weeks
>      <n>m = key expires in n months
>      <n>y = key expires in n years
>Key is valid for? (0)
>

选择有效期，可以根据实际情况来选，默认为永不过期。

>
>Real name:
>Email address:
>Comment:
>

这里是一些个人信息，根据实际情况来写。

> Change (N)ame, (C)omment, (E)mail or (O)kay/(Q)uit? O

输入完后，确定没问题后，键入 `O` 来完成。

之后会提示你创建 passphrase。

完成后，可以使用 `gpg --list-keys` 来查看上面创建的密钥：

>/home/example/.gnupg/pubring.gpg
>-----------------------------
>pub   ed25519 2019-03-13 [SC]
>      4C531B4CE9A26E80BECE72EC3453101C9E098A57
>uid           [ultimate] Colin Cheng <zbinlin@outlook.com>

可以加上参数 `--keyid-format <FORMAT>` 来查看密钥 ID，这会在下面的步骤里用得到。


### 创建 ssh 登录密钥

上面操作创建了主密钥，接下来，我们可以在主密钥下创建用于 ssh 登录的子密钥。

从上面的 `gpg --list-keys` 列出了刚创建的主钥密的 fingerprint 为 `4C531B4CE9A26E80BECE72EC3453101C9E098A57`，我们可以使用以下命令进入交互模式来添加子密钥：

```shell
gpg --expert --edit-key 4C531B4CE9A26E80BECE72EC3453101C9E098A57
```

**NOTE: `--expert` 必须放在 `--edit-key` 前面才可以生效**

执行上面的命令后，将进入交互模式：

>gpg>

键入 `addkey` 回车，来创建子密钥：

>Please select what kind of key you want:
>   (3) DSA (sign only)
>   (4) RSA (sign only)
>   (5) Elgamal (encrypt only)
>   (6) RSA (encrypt only)
>   (7) DSA (set your own capabilities)
>   (8) RSA (set your own capabilities)
>  (10) ECC (sign only)
>  (11) ECC (set your own capabilities)
>  (12) ECC (encrypt only)
>  (13) Existing key
>Your selection? 11

由于我们需要创建的是用于 ssh 登录的密钥，因此这里选择 `11`，来创建具有 `Authenticate` 功能的密钥：

>Possible actions for a ECDSA/EdDSA key: Sign Authenticate 
>Current allowed actions: Sign 
>
>   (S) Toggle the sign capability
>   (A) Toggle the authenticate capability
>   (Q) Finished
>
>Your selection? S

这里我们不需要这个密钥用于 `Sign`，因此可以键入 `S` 取消 `Sign`，然后再键入 `A` 添加 `Authenticate`，最后键入 `Q` 进入下一步。

>Please select which elliptic curve you want:
>   (1) Curve 25519
>   (3) NIST P-256
>   (4) NIST P-384
>   (5) NIST P-521
>   (6) Brainpool P-256
>   (7) Brainpool P-384
>   (8) Brainpool P-512
>   (9) secp256k1
>Your selection? 1

这里同样选择 `Curve 25519` 曲线。

>Please specify how long the key should be valid.
>         0 = key does not expire
>      <n>  = key expires in n days
>      <n>w = key expires in n weeks
>      <n>m = key expires in n months
>      <n>y = key expires in n years
>Key is valid for? (0)

然后是选择有效期。

>Is this correct? (y/N) y
>Really create? (y/N) y

不断确认，最后回到

>gpg>

这里，需要键入 `save` 保存并退出。

这时，如果使用 `gpg --list-keys` 命令：

>/home/example/.gnupg/pubring.gpg
>-----------------------------
>pub   ed25519 2019-03-13 [SC]
>      4C531B4CE9A26E80BECE72EC3453101C9E098A57
>uid           [ultimate] Colin Cheng <zbinlin@outlook.com>
>sub   ed25519 2019-03-13 [A]

可以看到多了最后一行

>sub   ed25519 2019-03-13 [A]

这就是用于 ssh 的登录的子密钥，其中 `sub` 表示是 `subkey`，`A` 表示是 `Authenticate`。

类似的标志：

```
C: Certify
S: Sign
A: Authenticate
E: Encrypt
```


## 设置

在生成用于 ssh 登录的密钥后，还不能直接使用，需要先进行一些设置。

首先设置 `SSH_AUTH_SOCK` 环境变量。

在 `~/.pam_environment` 文件里加入以下内容：

```
SSH_AGENT_PID DEFAULT=
SSH_AUTH_SOCK DEFAULT="${XDG_RUNTIME_DIR}/gnupg/S.gpg-agent.ssh"
```

另外需要在 `~/.bashrc` 或 `~/.zshrc` 中加入：

```shell
export GPG_TTY=$(tty)
gpg-connect-agent updatestartuptty /bye >/dev/null
```

如果使用 xfce4 作为图形界面的，由于 xfce session 会自动设置 `ssh-agent`，会导致上面设置的 `SSH_AGENT_PID` 和 `SSH_AUTH_SOCK` 在进入 X 后被重置（被重新设置成 ssh-agent 了），因此需要在 xfce 里禁用自动设置 `ssh-agent` 这个功能：

```
xfconf-query -c xfce4-session -p /startup/ssh-agent/enabled -n -t bool -s false
```

以上都设置完后，需要将上一步创建的 ssh 密钥添加到 GnuPG 的 `$GNUPGHOME/sshcontrol` 文件里。

首先通过 `gpg --list-keys --with-keygrip 4C531B4CE9A26E80BECE72EC3453101C9E098A57` 查看刚才创建的密钥的 keygrip：

>pub   ed25519 2019-03-13 [SC]
>      4C531B4CE9A26E80BECE72EC3453101C9E098A57
>      Keygrip = 7344328D1A4D5CDA50C6FA8B16133F744CD23FBA
>uid           [ultimate] Colin Cheng <zbinlin@outlook.com>
>sub   ed25519 2019-03-13 [A]
>      Keygrip = 35FD15CAE509225DDDACF98301526EB300415765

其中在子密钥下面的 `35FD15CAE509225DDDACF98301526EB300415765` 就是 ssh 密钥的 keygrip 了。

将其加入到 `$GNUPGHOME/sshcontrol` 里就可以了。


加好了之后，就可以通过以下命令把公钥导出来放到服务器上了：

```
# 找到 ssh subkey 的 id
gpg --list-keys --keyid-format long
# 导出公钥
gpg --armor --export-ssh-key 7FC2C4F53913F8FD
```

另外，也可以用类似创建 ssh 密钥的方式，创建一个用于 git 代码签名的 `Sign` 子密钥。


## 参考

* <https://wiki.archlinux.org/index.php/GnuPG>
* <https://docs.xfce.org/xfce/xfce4-session/advanced>