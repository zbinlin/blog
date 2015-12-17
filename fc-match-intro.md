# fc-match 使用简介

在修改 gvim 的字体时，发现有些字体显示得不一样，于是查看了 fontconfig 的配置文件
`~/.config/fontconfig`，但未找到问题所在。

于是想通过查看字体的加载顺序来进行排查，通过浏览 [fonts-conf][] 及 google，发现可以
通过 fc-match 来查看字体的匹配情况。但 `man fc-match` 的介绍非常简单，导致刚开始
不知道怎样用，后来通过 man 了 fontconfig 的其他工具（`fc-list`）以及 [fonts-conf][]，
大致了解了如何使用它，本文将简单的介绍下。

从 `fc-match -h` 的结果看：

```
usage: fc-match [-savVh] [-f FORMAT] [--sort] [--all] [--verbose] [--format=FORMAT] [--version] [--help] [pattern] {element...}
List best font matching [pattern]

  -s, --sort           display sorted list of matches
  -a, --all            display unpruned sorted list of matches
  -v, --verbose        display entire font pattern verbosely
  -f, --format=FORMAT  use the given output format
  -V, --version        display font config version and exit
  -h, --help           display this help and exit
```

`fc-match` 命令本身的选项不多，只是令人疑惑的是 pattern 跟 element 这两个参数，
不太清楚该如何写，在 `man fc-match` 中并没有一个很详细的说明。

还好在 `man fc-list` 也有这两个参数，并且它给出的两个例子：

```
       fc-list :lang=hi
              Lists font faces that cover Hindi.

       fc-list : family style file spacing
              Lists the filename and spacing value for each font  face.  ``:''
              is an empty pattern that matches all fonts.
```

再结合 [fonts-conf][]，可以看出，在 pattern 中，可以用 :*property[=value]* 来指
定 font property。并且 element 就是指 font 的 property 来的。

这个也可以通过 `fc-pattern` 命令来验证，例如：

```
fc-pattern "family name":lang=zh
```

的结果为：

```
Pattern has 2 elts (size 16)
	family: "family name"(s)
	lang: zh(s)

```

可以看到 "family name" 就是 font 的 family property。

明白了这个就知道如何使用了，例如：

```
### 匹配中文环境中 monospace 的斜体，并只显示字体名
fc-match monospace:lang=zh:slant=italic family
```

结果：

```
文泉驿等宽正黑,文泉驛等寬正黑,WenQuanYi Zen Hei Mono
```

上面的结果只显示配置中最佳匹配的那个字体，如果要显示全部匹配，可以加 `-s`（`--sort`）
或者 `-a`（`--all`），其中 `-s` 是已经按匹配的顺序排列的，`-a` 是未排列的。

如果需要打印指定的格式，可以使用 `-f`（`--format`）选项，该选项后跟一个格式字符串，
如果需要打印 font property，使用 `%{` 与 `}` 括起来，如：

```
fc-match --format "%{family}\n" monospace
```

结果：

```
文泉驿等宽正黑,文泉驛等寬正黑,WenQuanYi Zen Hei Mono
```

更多的格式可以查看 `man FcPatternFormat`。


[fonts-conf]: http://www.freedesktop.org/software/fontconfig/fontconfig-user.html
