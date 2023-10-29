#!/bin/bash


function clean_node_modules () {
  if [ -d node_modules ]; then
    echo "*********************************************************"
    echo "cleaning up previous build files and dependencies"
    
    rm -rf node_modules
    echo "*********************************************************"
  fi
}

function build_frontend () {
  if [ -d public ]; then

    echo "*********************************************************"
    echo "building frontend"
    yarn && yarn build && clean_node_modules
    echo "*********************************************************"

  fi
}

function build_iac () {
  if [ -f cdk.json ]; then

    echo "*********************************************************"
    echo "building infrastructure as code"
    
    yarn && yarn build && yarn synth

    echo "*********************************************************"

  fi
}



clean_node_modules

cd lib/dashboard-app

build_frontend

cd ../../

build_iac

