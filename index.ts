import * as k8s from "@pulumi/kubernetes";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const registry = config.require("registry");
const servername = config.require("servername");
const serverdesc = config.require("serverdesc");

const nsfetch = new docker.Image("nsfetch-image", {
    imageName: `${registry}/nsfetch:latest`,
    build: {
        context: "./nsfetch",
        platform: "linux/amd64",
        dockerfile: "nsfetch/Dockerfile",
    },
});

const nsdedicated = new docker.Image("nsded-image", {
    imageName: `${registry}/northstart-dedicated:latest`,
    build: {
        context: "./northstar-dedicated/src",
        platform: "linux/amd64",
        dockerfile: "./northstar-dedicated/src/Dockerfile",
    },
});

const thunderfetch = new docker.Image("thunderfetch-image", {
    imageName: `${registry}/thunderfetch:latest`,
    build: {
        context: "./thunderfetch",
        platform: "linux/amd64",
        dockerfile: "thunderfetch/Dockerfile",
    },
});

const ns = new k8s.core.v1.Namespace("northstar", { metadata: { name: "northstar" } });

const tfpvc = new k8s.core.v1.PersistentVolumeClaim("northstar-pvc", {
    metadata: { namespace: ns.metadata.name },
    spec: {
        accessModes: ["ReadWriteOnce"],
        resources: {
            requests: {
                storage: "20Gi",
            },
        },
        storageClassName: "rook-ceph-block",
    },
});

const modspvc = new k8s.core.v1.PersistentVolumeClaim("northstar-mods-pvc", {
    metadata: { namespace: ns.metadata.name },
    spec: {
        accessModes: ["ReadWriteOnce"],
        resources: {
            requests: {
                storage: "20Gi",
            },
        },
        storageClassName: "rook-ceph-block",
    },
});

//create configmap for northstar env vars
const configMap = new k8s.core.v1.ConfigMap("northstar-config", {
    metadata: { namespace: ns.metadata.name },
    data: {
        "NS_PORT": "37015",
        "NS_SERVER_NAME": servername,
        "NS_SERVER_DESC": serverdesc,
        "NS_EXTRA_ARGUMENTS" : `+setplaylist Extraction # Attrition
+mp_gamemode Extraction # Attrition
+map mp_angel_city
+ns_private_match_countdown_length 0
+ns_should_return_to_lobby 0
+net_compresspackets_minsize 64
+net_compresspackets 1
+spewlog_enable 0
+sv_maxrate 127000
`
    }
});
        
const appLabels = { app: "northstar" };
const deployment = new k8s.apps.v1.Deployment("northstar", {
    metadata: { namespace: ns.metadata.name },
    spec: {
        strategy: { type: "Recreate",},
        selector: { matchLabels: appLabels },
        replicas: 1,
        template: {
            metadata: { labels: appLabels },
            spec: {
                containers: [
                    { 
                        name: "northstar", 
                        image: nsdedicated.imageName,
                        imagePullPolicy: "Always",
                        envFrom: [
                            { configMapRef: { name: configMap.metadata.name } }
                        ],
                        ports: [
                            { name: "ns-port", containerPort: 37015, protocol: "UDP" },
                        ],
                        volumeMounts: [
                            { name: "ns-pvc", mountPath: "/mnt/titanfall" },
                            { name: "ns-mods-pvc", mountPath: "/mnt/mods" },
                        ],
                    },
            ],
            initContainers: [
                {
                    name: "fixpermissions",
                    image: "alpine",
                    command: ["sh", "-c", "chown -R 1000:1000 /mnt/titanfall && chown -R 1000:1000 /mnt/mods"],
                    volumeMounts: [
                        { name: "ns-pvc", mountPath: "/mnt/titanfall" },
                        { name: "ns-mods-pvc", mountPath: "/mnt/mods" },
                    ],
                    securityContext: {
                        runAsUser: 0,
                        runAsGroup: 0,
                    }
                },
                {
                    name: "nsfetch",
                    image: nsfetch.imageName,
                    volumeMounts: [
                        { name: "ns-pvc", mountPath: "/mnt/titanfall" },
                        { name: "ns-mods-pvc", mountPath: "/mnt/mods" },
                    ],
                },
                {
                    name: "git-clone",
                    image: "alpine/git",
                    command: ["sh", "-c", "git clone -b gamemode_fd_experimental --single-branch https://github.com/Zanieon/NorthstarMods.git /tmp/mods && cp -r /tmp/mods/Northstar.* /mnt/mods"],
                    volumeMounts: [
                        { name: "ns-mods-pvc", mountPath: "/mnt/mods" },
                    ],
                    securityContext: {
                        runAsUser: 1000,
                        runAsGroup: 1000,
                    }
                },
                {
                    name: "thunderfetch",
                    image: thunderfetch.imageName,
                    volumeMounts: [
                        { name: "ns-pvc", mountPath: "/mnt/titanfall" },
                        { name: "ns-mods-pvc", mountPath: "/mnt/mods" },
                    ],
                    securityContext: {
                        runAsUser: 1000,
                        runAsGroup: 1000,
                    },
                    env: [
                        { name: "package", value: "Zanieon-Extraction_Gamemode-1.2.1.zip" },
                    ]
                }
            ],
            volumes: [
                { name: "ns-pvc", persistentVolumeClaim: { claimName: tfpvc.metadata.name } },
                { name: "ns-mods-pvc", persistentVolumeClaim: { claimName: modspvc.metadata.name } },
            ],
            }
        }
    }
});
export const name = deployment.metadata.name;

// Create a service to expose the deployment
const service = new k8s.core.v1.Service("northstar-service", {
    metadata: { namespace: ns.metadata.name },
    spec: {
        type: "LoadBalancer",
        ports: [
            { name: "ns-port", port: 37015, targetPort: 37015, protocol: "UDP" },
        ],
        selector: appLabels,
    },
});
export const serviceName = service.metadata.name;