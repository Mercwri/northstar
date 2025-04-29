# Northstar K8s Deployment via Pulumi

This repo is built as *rough* skeleton for hosting a northstar server on a local kubernetes cluster.

This repo expects that you *already* have Pulumi and a Local Cluster ready to go.

Pulumi Config Settings Required:
* registry: the url of your docker registry, this is expected to be local
* servername: the name of your server shwown in the browser.
* serverdesc: the description blurb for your server shown in the browser.

## Why are we rebuilding the northstar-dedicated image?
Because the default has saftey checks that prevent re-writing the core mods, to support Extraction we need to use the experimental branch.

## What to watch for on configuration
The current PVC setup is *highly* opionated and is based around the assumption of using ceph, review those sections and update to fit your storage. *Technically* these could be done as empty dirs instead of retaining any storage but that means pulling the titanfall core files, the experimental branch mods, and the extraction mod *every* time you restart the server.

Networking on this assumes you have *some* kind of Loadbalancer configured, if you don't you'll need to modify the deployment to handle a nodeport or something horrific like that.
