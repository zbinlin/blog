# PostgreSQL 使用笔记

初始化数据库

```shell
su - postgres -c "initdb --locale en_US.UTF-8 -E UTF8 -D '/var/lib/postgres/data'"
```
解释：使用 postgres 用户进行登录并切换到该用户的目录，并执行命令：`initdb --locale en_US.UTF-8 -E UTF8 -D '/var/lib/postgres/data'`
其中参数 `-D` 指定数据库存放的目录（注：在 Arch Linux 中，postgresql 默认的目录为 `/var/lib/postgres`，而在 CentOS 中，是在 `/var/lib/pgsql`）

创建用户/角色
有两种方式创建，一种是使用 `createuser` 命令，一种是使用 SQL 语句：

```shell
createuser <USERNAME>
```
```sql
CREATE USER <USERNAME> [WITH ...];
-- 或者
CREATE ROLE <ROLENAME> [WITH ...];
```
在上面的命令中，使用 `createuser` 或者 `CREATE USER ...`，与 `CREATE ROLE ...` 的区别是：前者创建的用户/角色有 `LOGIN` 权限，而后者为 `NOLOGIN` 即没有登录的权限（当然，也可以通过后面的 WITH 添加 LOGIN 权限）。


删除用户/角色：

```shell
dropuser <USERNAME>
```
```sql
DROP USER [IF EXISTS] <USERNAME>;
-- 或者
DROP ROLE [IF EXISTS] <ROLENAME>;
```

创建数据库：

```shell
createdb <DBNAME>
```
```sql
CREATE DATABASE <DBNAME>
```

删除数据库：

```shell
dropdb <DBNAME>
```
```sql
DROP DATABASE <DBNAME>
```

列出所有数据库：

使用 psql 登入后，使用：
```
\l
```
mysql 可以使用以下 SQL 语句：
```sql
show DATABASES;
```

在 psql 里使用（连接）其他的数据库（类似 mysql 里的 `use <DBNAME>;`）：

```
\c <DBNAME>
```

修改 user/role 密码：

```
\password [USERNAME]
```
或者：
```
ALTER ROLE XXX WITH PASSWORD 'XXXXXX';
```

显示表的列名（attribute）：
```
SELECT column_name, data_type, character_maximum_length
FROM INFORMATION_SCHEMA.COLUMNS where table_name = '<name of table>';
```
或者：
```
\d+ <name of table>
```
其中 `<name of table>` 替换为具体需要查询的表名


在 psql 中，将查询结果复制到文件中：
```
\copy (SELECT * FROM foo) To '/tmp/test.csv' WITH FORMAT csv
```
可以将 `SELECT * FROM foo` 替换成你需要查询的语句，`/tmp/test.csv` 替换成需要保存的位置，FORMAT 支持三种：`text`、`csv`、`binary`

重置 SERIAL 计数：
```
SELECT setval('<seqname>',<next_value>);
```
将 `<seqname>` 替换成具体的 sequence name，`<next_value>` 替换成具体的计数值 （注：如果 next_value 为 1，则新插入的下一个值为 2）

也可以使用 `ALTER` 语句：
```
ALTER SEQUENCE <seqname> RESTART WITH 1
```
将 `<seqname>` 替换成具体的 sequence name


移除某个 constraint：
```
ALTER TABLE <table_name>
DROP CONSTRAINT <constraint_name>;
```

SQL SELECT 语句的逻辑执行顺序：
```
FROM
ON
JOIN
WHERE
GROUP BY
WITH CUBE or WITH ROLLUP
HAVING
SELECT
DISTINCT
ORDER BY
TOP
```

先去重，再排序：
```sql
SELECT author_id, author_name FROM (SELECT DISTINCT author_id, author_name FROM book_info_original) AS t ORDER BY author_id::int ASC;
```

查询重复数据：
```sql
SELECT name FROM t GROUP BY name HAVING count(name) > 1;
```

从另一个表导入数据：
```
INSERT INTO author(original_id, name)
SELECT author_id, author_name
FROM (
    SELECT DISTINCT author_id, author_name FROM original
) AS t
ORDER BY author_id::int ASC;
```

导出数据库：

```shell
pg_dump -U {USERNAME} {DBNAME} > db.pgsql
```

`pg_dump` 导出的数据默认带有 ownership（即面里有一个 ALTER 语句修改 table 的 owner 为原来数据库里对应的 user/role），如果该数据库的 owner（user/role）在导入的 postgresql 中不存在时，可能会发生错误。可以添加 `--no-owner` 选项，使导出的数据不带有 onwership

导入数据库：

```shell
psql -U {USERNAME} {DBNAME} < db.pgsql
```
默认时，当导入数据库有错误时，psql 会忽略它并继续导入，可以使用 `--set ON_ERROR_STOP=on` 选项来阻止：

```shell
psql --set ON_ERROR_STOP=on -U {USERNAME} {DBNAME} < db.pgsql
```

如果需要导出指定的表可以使用 `-t {TABLE_NAME}`，多个表就加上多个的 `-t {TABLE_NAME}`。如果多个表的数据太大，可以使用 `-j N`（其中 N 为具体并行的数字）来进行并行导出，但该参数只能用于 `-F d`，即导出为为目录（里面每个文件对应相应的表）。通过该方式导出的数据，需要使用 `pg_restore` 来导入到新的数据库中。

```shell
pg_dump -t account -t author -t book_category  -t book_category_mobile -t book_img -t book_info -t book_volume -t book_chapter -U postgres -O -h localhost -p 15432 -d novel -j 8 -Fd -f db
```
导入：

```shell
pg_restore -U postgres -O -h localhost --role {ROLE} -p 15432 -d novel -j8 -Fd db
```
其中 `--role {ROLE}` 可以在恢复数据前使用 `SET ROLE {ROLE}` 将 `{ROLE}` 设置当前 session 的 user id。这样，在恢复数据时将使用 `{ROLE}` 而不是 `postgres`（登录用户）来操作（其权限为 `{ROLE}` 所拥有的）。
