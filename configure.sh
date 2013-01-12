#!/bin/sh

# Checks/installs required Ruby Gems.
BUNDLE="`which bundle`"
${BUNDLE} install

# Checks/installs required NodeJS modules.
NPM="`which npm`"
${NPM} install

# Grunt...
grunt $1