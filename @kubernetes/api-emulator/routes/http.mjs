function getConfig(store) {
  return store.getData("kubernetes:config") ?? { clusters: [] };
}

function getCluster(store) {
  const config = getConfig(store);
  return config.clusters?.[0] ?? {};
}

function list(items) {
  return {
    apiVersion: "v1",
    kind: "List",
    metadata: { resourceVersion: "1" },
    items,
  };
}

function namespaceResource(namespace) {
  return {
    apiVersion: "v1",
    kind: "Namespace",
    metadata: { name: namespace.name },
    status: { phase: namespace.status ?? "Active" },
  };
}

function nodeResource(node) {
  return {
    apiVersion: "v1",
    kind: "Node",
    metadata: {
      name: node.name,
      labels: node.labels ?? {},
    },
    spec: {
      taints: node.taints ?? [],
    },
    status: {
      conditions: node.conditions ?? [],
      capacity: node.capacity ?? { cpu: "2", memory: "8Gi", pods: "110" },
      allocatable: node.allocatable ?? node.capacity ?? { cpu: "1900m", memory: "7Gi", pods: "100" },
    },
  };
}

function podResource(pod) {
  return {
    apiVersion: "v1",
    kind: "Pod",
    metadata: {
      name: pod.name,
      namespace: pod.namespace,
    },
    spec: {
      nodeName: pod.node,
      containers: pod.containers?.map((container) => ({
        name: container.name,
        image: container.image ?? "example.invalid/emulated-container:latest",
      })) ?? [],
    },
    status: {
      phase: pod.phase ?? "Unknown",
      conditions: pod.conditions ?? [],
      containerStatuses: pod.containers?.map(containerStatus) ?? [],
    },
  };
}

function containerStatus(container) {
  return {
    name: container.name,
    image: container.image ?? "example.invalid/emulated-container:latest",
    imageID: container.image_id ?? "docker-pullable://example.invalid/emulated-container@sha256:emulated",
    ready: container.ready ?? false,
    restartCount: container.restart_count ?? 0,
    state: containerState(container),
    lastState: container.last_termination
      ? {
          terminated: {
            reason: container.last_termination.reason,
            message: container.last_termination.message,
            exitCode: container.last_termination.exit_code ?? 1,
          },
        }
      : {},
  };
}

function containerState(container) {
  if (container.state === "waiting") {
    return { waiting: { reason: container.reason, message: container.message } };
  }
  if (container.state === "terminated") {
    return {
      terminated: {
        reason: container.reason,
        message: container.message,
        exitCode: container.exit_code ?? 1,
      },
    };
  }
  return { running: { startedAt: new Date(0).toISOString() } };
}

function eventResource(event) {
  return {
    apiVersion: "v1",
    kind: "Event",
    metadata: {
      name: `${event.involved_object.name}.${event.reason}`,
      namespace: event.namespace,
    },
    type: event.type ?? "Normal",
    reason: event.reason,
    message: event.message,
    count: event.count ?? 1,
    lastTimestamp: event.last_timestamp ?? null,
    involvedObject: {
      kind: event.involved_object.kind,
      name: event.involved_object.name,
      namespace: event.namespace,
    },
  };
}

function deploymentResource(deployment) {
  return {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name: deployment.name,
      namespace: deployment.namespace,
    },
    spec: {
      replicas: deployment.replicas ?? 1,
      selector: { matchLabels: deployment.selector ?? { app: deployment.name } },
      template: {
        metadata: { labels: deployment.selector ?? { app: deployment.name } },
        spec: {
          containers: deployment.containers ?? [
            {
              name: deployment.name,
              image: "example.invalid/emulated-container:latest",
            },
          ],
        },
      },
      strategy: { type: deployment.strategy ?? "RollingUpdate" },
    },
    status: {
      replicas: deployment.current_replicas ?? deployment.replicas ?? 1,
      readyReplicas: deployment.ready_replicas ?? 0,
      availableReplicas: deployment.available_replicas ?? 0,
      unavailableReplicas: deployment.unavailable_replicas ?? 0,
      updatedReplicas: deployment.updated_replicas ?? deployment.ready_replicas ?? 0,
      conditions: deployment.conditions ?? [],
    },
  };
}

function serviceResource(service) {
  return {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name: service.name,
      namespace: service.namespace,
    },
    spec: {
      type: service.type ?? "ClusterIP",
      clusterIP: service.cluster_ip ?? "10.96.0.1",
      ports: service.ports ?? [],
      selector: service.selector ?? {},
    },
    status: {
      loadBalancer: {
        ingress: service.external_ips?.map((value) => {
          if (value.includes(".")) return { hostname: value };
          return { ip: value };
        }) ?? [],
      },
    },
  };
}

function endpointsResource(endpoints) {
  return {
    apiVersion: "v1",
    kind: "Endpoints",
    metadata: {
      name: endpoints.name,
      namespace: endpoints.namespace,
    },
    subsets: endpoints.subsets ?? [],
  };
}

function ingressResource(ingress) {
  return {
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: {
      name: ingress.name,
      namespace: ingress.namespace,
    },
    spec: {
      rules: (ingress.rules ?? []).map((rule) => ({
        host: rule.host,
        http: {
          paths: (rule.paths ?? []).map((path) => ({
            path: path.path ?? "/",
            pathType: path.path_type ?? "Prefix",
            backend: {
              service: {
                name: path.service_name,
                port: { number: path.service_port },
              },
            },
          })),
        },
      })),
    },
  };
}

function pvcResource(pvc) {
  return {
    apiVersion: "v1",
    kind: "PersistentVolumeClaim",
    metadata: {
      name: pvc.name,
      namespace: pvc.namespace,
    },
    spec: {
      volumeName: pvc.volume_name,
      storageClassName: pvc.storage_class,
      accessModes: pvc.access_modes ?? ["ReadWriteOnce"],
    },
    status: {
      phase: pvc.status ?? "Bound",
      capacity: pvc.capacity ? { storage: pvc.capacity } : undefined,
    },
  };
}

function roleResource(role) {
  return {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: "Role",
    metadata: {
      name: role.name,
      namespace: role.namespace,
    },
    rules: role.rules ?? [],
  };
}

function serviceAccountResource(serviceAccount) {
  return {
    apiVersion: "v1",
    kind: "ServiceAccount",
    metadata: {
      name: serviceAccount.name,
      namespace: serviceAccount.namespace,
    },
    secrets: serviceAccount.secrets ?? [],
  };
}

function fieldSelectorName(fieldSelector) {
  const prefix = "involvedObject.name=";
  return fieldSelector?.startsWith(prefix) ? fieldSelector.slice(prefix.length) : null;
}

function findByName(items, name, namespace) {
  return items.find((item) => item.name === name && item.namespace === namespace);
}

export const plugin = {
  name: "kubernetes",
  register(app, store) {
    app.get("/api/v1/namespaces", (c) => {
      const cluster = getCluster(store);
      return c.json(list((cluster.namespaces ?? []).map(namespaceResource)));
    });

    app.get("/api/v1/nodes", (c) => {
      const cluster = getCluster(store);
      return c.json(list((cluster.nodes ?? []).map(nodeResource)));
    });

    app.get("/api/v1/pods", (c) => {
      const cluster = getCluster(store);
      const fieldSelector = c.req.query("fieldSelector");
      const nodePrefix = "spec.nodeName=";
      const nodeName = fieldSelector?.startsWith(nodePrefix) ? fieldSelector.slice(nodePrefix.length) : null;
      const pods = (cluster.pods ?? [])
        .filter((pod) => !nodeName || pod.node === nodeName)
        .map(podResource);
      return c.json(list(pods));
    });

    app.get("/api/v1/namespaces/:namespace/pods", (c) => {
      const cluster = getCluster(store);
      const namespace = c.req.param("namespace");
      const pods = (cluster.pods ?? [])
        .filter((pod) => pod.namespace === namespace)
        .map(podResource);
      return c.json(list(pods));
    });

    app.get("/api/v1/namespaces/:namespace/pods/:name", (c) => {
      const cluster = getCluster(store);
      const pod = findByName(
        cluster.pods ?? [],
        c.req.param("name"),
        c.req.param("namespace"),
      );
      if (!pod) return c.json({ message: "pod not found" }, 404);
      return c.json(podResource(pod));
    });

    app.get("/api/v1/namespaces/:namespace/pods/:name/log", (c) => {
      const cluster = getCluster(store);
      const namespace = c.req.param("namespace");
      const name = c.req.param("name");
      const logs = cluster.logs?.[namespace]?.[name];
      if (logs == null) return c.text("pod logs not found", 404);
      const tailLines = Number(c.req.query("tailLines") ?? c.req.query("tail_lines") ?? 0);
      if (!tailLines) return c.text(logs);
      return c.text(logs.split("\n").slice(-tailLines).join("\n"));
    });

    app.get("/api/v1/namespaces/:namespace/events", (c) => {
      const cluster = getCluster(store);
      const namespace = c.req.param("namespace");
      const resourceName = fieldSelectorName(c.req.query("fieldSelector"));
      const events = (cluster.events ?? [])
        .filter((event) => event.namespace === namespace)
        .filter((event) => !resourceName || event.involved_object.name === resourceName)
        .map(eventResource);
      return c.json(list(events));
    });

    app.get("/api/v1/namespaces/:namespace/services", (c) => {
      const cluster = getCluster(store);
      const namespace = c.req.param("namespace");
      const services = (cluster.services ?? [])
        .filter((service) => service.namespace === namespace)
        .map(serviceResource);
      return c.json(list(services));
    });

    app.get("/api/v1/namespaces/:namespace/services/:name", (c) => {
      const cluster = getCluster(store);
      const service = findByName(
        cluster.services ?? [],
        c.req.param("name"),
        c.req.param("namespace"),
      );
      if (!service) return c.json({ message: "service not found" }, 404);
      return c.json(serviceResource(service));
    });

    app.get("/api/v1/namespaces/:namespace/endpoints/:name", (c) => {
      const cluster = getCluster(store);
      const endpoints = findByName(
        cluster.endpoints ?? [],
        c.req.param("name"),
        c.req.param("namespace"),
      );
      if (!endpoints) return c.json({ message: "endpoints not found" }, 404);
      return c.json(endpointsResource(endpoints));
    });

    app.get("/api/v1/namespaces/:namespace/persistentvolumeclaims", (c) => {
      const cluster = getCluster(store);
      const namespace = c.req.param("namespace");
      const pvcs = (cluster.pvcs ?? [])
        .filter((pvc) => pvc.namespace === namespace)
        .map(pvcResource);
      return c.json(list(pvcs));
    });

    app.get("/api/v1/namespaces/:namespace/serviceaccounts", (c) => {
      const cluster = getCluster(store);
      const namespace = c.req.param("namespace");
      const serviceAccounts = (cluster.service_accounts ?? [])
        .filter((serviceAccount) => serviceAccount.namespace === namespace)
        .map(serviceAccountResource);
      return c.json(list(serviceAccounts));
    });

    app.get("/apis/apps/v1/namespaces/:namespace/deployments", (c) => {
      const cluster = getCluster(store);
      const namespace = c.req.param("namespace");
      const deployments = (cluster.deployments ?? [])
        .filter((deployment) => deployment.namespace === namespace)
        .map(deploymentResource);
      return c.json(list(deployments));
    });

    app.get("/apis/apps/v1/namespaces/:namespace/deployments/:name", (c) => {
      const cluster = getCluster(store);
      const deployment = findByName(
        cluster.deployments ?? [],
        c.req.param("name"),
        c.req.param("namespace"),
      );
      if (!deployment) return c.json({ message: "deployment not found" }, 404);
      return c.json(deploymentResource(deployment));
    });

    app.get("/apis/networking.k8s.io/v1/namespaces/:namespace/ingresses", (c) => {
      const cluster = getCluster(store);
      const namespace = c.req.param("namespace");
      const ingresses = (cluster.ingresses ?? [])
        .filter((ingress) => ingress.namespace === namespace)
        .map(ingressResource);
      return c.json(list(ingresses));
    });

    app.get("/apis/rbac.authorization.k8s.io/v1/namespaces/:namespace/roles", (c) => {
      const cluster = getCluster(store);
      const namespace = c.req.param("namespace");
      const roles = (cluster.roles ?? [])
        .filter((role) => role.namespace === namespace)
        .map(roleResource);
      return c.json(list(roles));
    });

    app.get("/apis/core.k8sgpt.ai/v1alpha1/results", (c) => {
      const cluster = getCluster(store);
      return c.json(list(cluster.k8sgpt_results ?? []));
    });

    app.get("/apis/core.k8sgpt.ai/v1alpha1/namespaces/:namespace/results", (c) => {
      const cluster = getCluster(store);
      const namespace = c.req.param("namespace");
      const results = (cluster.k8sgpt_results ?? []).filter(
        (result) => result.metadata?.namespace === namespace,
      );
      return c.json(list(results));
    });
  },
};

export function seedFromConfig(store, _baseUrl, config) {
  store.setData("kubernetes:config", config);
}

export const label = "Kubernetes API emulator for chatbot tests";
export const endpoints = "namespaces, nodes, pods, pod logs, events, deployments, K8sGPT results";
export const initConfig = {
  kubernetes: {
    clusters: [{ name: "dev", namespaces: [{ name: "default" }] }],
  },
};
