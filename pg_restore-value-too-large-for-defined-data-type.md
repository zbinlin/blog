# pg_restore: [directory archiver] could not open input file "xxx/xxx.dat": Value too large for defined data type

最近将本地的一个数据库搬到 VPS 上，在导入时出现了一个”Value too large for defined data type“的错误。通过 Google 搜索后发现没有实际的解决方案，但大致了解了下（[http://www.gnu.org/software/coreutils/faq/coreutils-faq.html#Value-too-large-for-defined-data-type]()）出错的原因，可能是因为 VPS 的系统是 32bit，而其中需要导入的一个 xxx.dat.gz 文件的太大导致的。

由于在本地使用 `pg_dump -Fd` 来导出，该选项导出为文件夹，其中数据库的每个表的数据为一个经过 gzip 压缩的文件，后缀为 *.dat.gz*。该导出方式不能直接通过 `psql` 来导出，而需要使用 `pg_restore` 来导入。

由于数据库文件太大，而本地上传到 VPS 的带宽太小了，如果要重新导出为 plain text 格式再上传比较麻烦。于是想了下发现错误的原因，可能在于 `pg_restore` 导入时，需要对 gzip 文件进行解压操作，而由于受系统（32bit）的限制而造成的。

那能不能在外面使用先解压出来，而 `pg_restore` 又支持导入已解压的文件（根据它可以直接读取 toc.dat 文件推测的）呢？

根据这个猜测，先尝试下使用系统自带的 `gnuzip` 对其进行解压，然后再将解压出来的文件替换原来未解压的文件。

经过测试，发现可以正常解压出来，并且 `pg_restore` 也可以识别（支持）解压出来的文件。
