#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${PROJECT_ROOT}/.venv"

# Locate source Node installation to seed standalone binaries
SOURCE_NODE_BIN="${SOURCE_NODE_BIN:-$(command -v node || true)}"
if [[ -z "${SOURCE_NODE_BIN}" && -x "${HOME}/.nvm/versions/node/v25.2.1/bin/node" ]]; then
  SOURCE_NODE_BIN="${HOME}/.nvm/versions/node/v25.2.1/bin/node"
fi

if [[ -z "${SOURCE_NODE_BIN}" ]]; then
  echo "Error: Could not find a base node binary to seed .venv" >&2
  exit 1
fi

SOURCE_NODE_ROOT="$(cd "$(dirname "${SOURCE_NODE_BIN}")/.." && pwd)"

echo "Creating standalone Node environment in ${VENV_DIR}..."
rm -rf "${VENV_DIR}"
mkdir -p "${VENV_DIR}/bin" "${VENV_DIR}/lib/node_modules" "${VENV_DIR}/include" "${VENV_DIR}/.npm-cache"

# Copy standalone node binary and core npm package (excluding unrelated global packages)
cp -f "${SOURCE_NODE_ROOT}/bin/node" "${VENV_DIR}/bin/node"
chmod +x "${VENV_DIR}/bin/node"

cp -R "${SOURCE_NODE_ROOT}/lib/node_modules/npm" "${VENV_DIR}/lib/node_modules/npm"
if [[ -d "${SOURCE_NODE_ROOT}/include/node" ]]; then
  cp -R "${SOURCE_NODE_ROOT}/include/node" "${VENV_DIR}/include/node"
fi

# Create standalone npm and npx launchers inside .venv/bin that explicitly use .venv/bin/node
cat > "${VENV_DIR}/bin/npm" << 'EOF'
#!/usr/bin/env bash
VENV_BIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_ROOT="$(cd "${VENV_BIN}/.." && pwd)"
export NPM_CONFIG_CACHE="${VENV_ROOT}/.npm-cache"
exec "${VENV_BIN}/node" "${VENV_ROOT}/lib/node_modules/npm/bin/npm-cli.js" "$@"
EOF
chmod +x "${VENV_DIR}/bin/npm"

cat > "${VENV_DIR}/bin/npx" << 'EOF'
#!/usr/bin/env bash
VENV_BIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_ROOT="$(cd "${VENV_BIN}/.." && pwd)"
export NPM_CONFIG_CACHE="${VENV_ROOT}/.npm-cache"
exec "${VENV_BIN}/node" "${VENV_ROOT}/lib/node_modules/npm/bin/npx-cli.js" "$@"
EOF
chmod +x "${VENV_DIR}/bin/npx"

# Write Python venv / nodeenv style activate script
cat > "${VENV_DIR}/bin/activate" << 'EOF'
# This file must be used with "source .venv/bin/activate" from bash or zsh.

deactivate () {
    if [ -n "${_OLD_NODE_VIRTUAL_PATH:-}" ] ; then
        PATH="${_OLD_NODE_VIRTUAL_PATH:-}"
        export PATH
        unset _OLD_NODE_VIRTUAL_PATH
    fi
    if [ -n "${_OLD_NPM_CONFIG_CACHE:-}" ] ; then
        NPM_CONFIG_CACHE="${_OLD_NPM_CONFIG_CACHE:-}"
        export NPM_CONFIG_CACHE
        unset _OLD_NPM_CONFIG_CACHE
    else
        unset NPM_CONFIG_CACHE
    fi
    if [ -n "${_OLD_NODE_VIRTUAL_PS1:-}" ] ; then
        PS1="${_OLD_NODE_VIRTUAL_PS1:-}"
        export PS1
        unset _OLD_NODE_VIRTUAL_PS1
    fi

    unset NODE_VIRTUAL_ENV
    unset VIRTUAL_ENV_PROMPT
    if [ ! "${1:-}" = "nondestructive" ] ; then
        unset -f deactivate
    fi
}

# Unset irrelevant variables
deactivate nondestructive

NODE_VIRTUAL_ENV="__VENV_DIR__"
export NODE_VIRTUAL_ENV

_OLD_NODE_VIRTUAL_PATH="$PATH"
PATH="${NODE_VIRTUAL_ENV}/bin:__PROJECT_ROOT__/node_modules/.bin:${PATH}"
export PATH

_OLD_NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-}"
NPM_CONFIG_CACHE="${NODE_VIRTUAL_ENV}/.npm-cache"
export NPM_CONFIG_CACHE

if [ -z "${NODE_VIRTUAL_ENV_DISABLE_PROMPT:-}" ] ; then
    _OLD_NODE_VIRTUAL_PS1="${PS1:-}"
    PS1="(3d-city) ${PS1:-}"
    export PS1
    VIRTUAL_ENV_PROMPT="(3d-city) "
    export VIRTUAL_ENV_PROMPT
fi

if [ -n "${BASH:-}" -o -n "${ZSH_VERSION:-}" ] ; then
    hash -r 2> /dev/null
fi
EOF

sed -i '' "s|__VENV_DIR__|${VENV_DIR}|g" "${VENV_DIR}/bin/activate"
sed -i '' "s|__PROJECT_ROOT__|${PROJECT_ROOT}|g" "${VENV_DIR}/bin/activate"

echo "Standalone Node environment ready:"
echo "  Node binary: ${VENV_DIR}/bin/node ($(${VENV_DIR}/bin/node -v))"
echo "  npm binary:  ${VENV_DIR}/bin/npm ($(${VENV_DIR}/bin/npm -v))"
echo "  Activate with: source .venv/bin/activate"
