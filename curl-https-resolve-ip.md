#在 curl 中使用指定 ip 来进行请求 https

一般地，在 curl 中，如果想以指定的 ip 来请求一个域名地，可以使用 `curl http://127.0.0.1/example -H 'Host: www.example.org'`
这种指定 Host 头的做法，但这在 https 中可能会失败，显示 `no alternative certificate subject name matches target host name '127.0.0.1`。

显然这是由于 curl 将 `https://127.0.0.1` 里的 `127.0.0.1` 而不是 Host 头用于验证证书的 subject name，而这个 ip 如果不在证书的 subject names 中,
将会导致证书验证失败。

一般的解决方案，我们可以在 `/etc/hosts` 或 dnsmasq 用指定 ip 解析这个域名，但这改起来显示比较繁琐。还好在 curl 7.21.3 中，提供了一个 `--resolve <host:port:address>'` 的
参数，让我们可以很方便地将域名解析到指定的 ip 上，例如上面的请求可以改成 `curl --resolve 'www.example.org:443:127.0.0.1' https://www.example.org`。
