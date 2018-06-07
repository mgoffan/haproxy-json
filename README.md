# HAProxy JSON

## Usage and CLI options

```
  Usage: index [options] -f file [-f file]*

  Options:

    -V, --version          output the version number
    -f, --file <file>      Input file
    -o, --output [output]  Output file (default: haproxy.cfg)
    --tab-size [tab-size]  Tab size. Only applies if indented with (default: 2)
    -t, --tab [tab]        Flag to indent with tabs (default: false)
    -h, --help             output usage information
```

## Example

`sample.json`

```javascript
{
    "global": {
        "chroot": "/var/lib/haproxy1",
        "user": "haproxy",
        "group": "haproxy"
    },
    "defaults": {
        "mode": "http"
    }
}
```

`sample2.json`

```javascript
{
    "global": {
        "chroot": "/var/lib/haproxy2",
        "user": "haproxy",
        "group": "haproxy"
    },
    "defaults": {
        "retries": 3
    }
}
```

When run with `node index.js -f sample.json -f sample2.json --tab-size 8` outputs:

```
global
        chroot /var/lib/haproxy2
        user haproxy
        group haproxy
defaults
        mode http
defaults
        retries 3
```