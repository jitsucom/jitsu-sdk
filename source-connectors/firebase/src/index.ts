import { SourceCatalog, StreamReader, StreamSink, StreamConfiguration } from "@jitsu/types/sources";
import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";
import { initializeApp, deleteApp, App, cert } from "firebase-admin/app";

import JSON5 from "json5";
import { streamUsers } from "./users";
import { streamFirestore } from "./firestore";

export interface FirebaseConfig {
  service_account_key: string | any;
  project_id: string;
}

export interface UsersStreamConfig {}

export interface FirestoreStreamConfig {
  collection: string;
}

const descriptor: ExtensionDescriptor<FirebaseConfig> = {
  id: "redis",
  displayName: "Redis Source",
  description: "Pulls data from Redis database",
  configurationParameters: [
    {
      id: "service_account_key",
      displayName: "Service Account Key JSON",
      type: "json",
      documentation:
        "Read how to get an account here: https://cloud.google.com/iam/docs/creating-managing-service-account-keys",
      required: true,
    },
    {
      id: "project_id",
      displayName: "Project ID",
      documentation: "Firebase Project ID",
      required: true,
    },
  ],
};

function getFirebaseApp(config: FirebaseConfig): App {
  const jsonCredentials =
    typeof config.service_account_key === "string"
      ? JSON5.parse(config.service_account_key)
      : config.service_account_key;
  return initializeApp({ credential: cert(jsonCredentials), projectId: config.project_id });
}

async function validator(config: FirebaseConfig): Promise<ConfigValidationResult> {
  let app = getFirebaseApp(config);
  await deleteApp(app);
  return true;
}

const sourceCatalog: SourceCatalog<FirebaseConfig> = async () => {
  return [
    {
      type: "users",
      mode: "full_sync",
      params: [],
    },
    {
      type: "firestore",
      mode: "full_sync",
      params: [
        {
          id: "collection",
          displayName: "Firestore Collection",
          documentation:
            "Firestore collection ID. Can include wildcard for example: 'collection/*/sub_collection' will synchronized only sub collections from all objects in 'collection'",
        },
      ],
    },
  ];
};

const streamReader: StreamReader<FirebaseConfig, FirestoreStreamConfig | UsersStreamConfig> = async (
  sourceConfig: FirebaseConfig,
  streamType: string,
  streamConfiguration: StreamConfiguration<FirestoreStreamConfig | UsersStreamConfig>,
  streamSink: StreamSink
) => {
  let firebaseApp = getFirebaseApp(sourceConfig);
  try {
    if (streamType === "users") {
      await streamUsers(firebaseApp, streamSink);
    } else {
      await streamFirestore(sourceConfig, streamConfiguration.parameters as FirestoreStreamConfig, streamSink);
    }
  } finally {
    await deleteApp(firebaseApp);
  }
};

export { streamReader, sourceCatalog, descriptor, validator };
