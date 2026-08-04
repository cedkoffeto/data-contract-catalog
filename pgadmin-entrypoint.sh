#!/bin/sh
set -e

# Generate servers.json as root before pgAdmin starts
python3 -c "
import os, string
tmpl_path = '/pgadmin4/servers.json.template'
if os.path.exists(tmpl_path):
    tmpl = open(tmpl_path).read()
    result = string.Template(tmpl).safe_substitute(os.environ)
    open('/pgadmin4/servers.json', 'w').write(result)
    os.chmod('/pgadmin4/servers.json', 0o666)
    print('Generated /pgadmin4/servers.json')
"

exec /entrypoint.sh
