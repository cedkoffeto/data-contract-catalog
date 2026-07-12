#!/bin/sh
set -e

python3 -c "
import os, string
tmpl_path = '/pgadmin4/servers.json.template'
out_path = '/pgadmin4/servers.json'
if os.path.exists(tmpl_path):
    tmpl = open(tmpl_path).read()
    result = string.Template(tmpl).safe_substitute(os.environ)
    open(out_path, 'w').write(result)
"

exec /entrypoint.sh
