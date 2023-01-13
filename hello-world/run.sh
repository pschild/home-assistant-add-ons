#!/usr/bin/with-contenv bashio
set +u

export TRAFFIC_PROVIDER=$(bashio::config 'traffic_provider')
bashio::log.info "Traffic Provider configured as ${TRAFFIC_PROVIDER}."

bashio::log.info "Starting service."
node dist/index.js