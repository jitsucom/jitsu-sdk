import { GetAllStreams, Streamer, StreamSink, StreamConfiguration } from "@jitsu/types/sources";
import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";

export interface FirebaseConfig {
  serviceJson: string | any;
  projectId: string;
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
      id: "serviceJson",
      displayName: "Service Account Key JSON",
      documentation:
        "Read how to get an account here: https://cloud.google.com/iam/docs/creating-managing-service-account-keys",
      required: true,
    },
    {
      id: "projectId",
      displayName: "Project ID",
      defaultValue: 6379,
      documentation: "Firebase Project ID",
      required: true,
    },
  ],
};

async function validator(config: FirebaseConfig): Promise<ConfigValidationResult> {
  return true;
}

const getAllStreams: GetAllStreams<FirebaseConfig> = async () => {
  return [
    {
      streamName: "users",
      mode: "full_sync",
      params: [],
    },
    {
      streamName: "firestore",
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


function streamFirestore() {

}

function streamUsers() {

}

const streamer: Streamer<FirebaseConfig, FirestoreStreamConfig | UsersStreamConfig> = async (
  sourceConfig: FirebaseConfig,
  streamName: string,
  streamConfiguration: StreamConfiguration<FirestoreStreamConfig | UsersStreamConfig>,
  streamSink: StreamSink
) => {
  if (streamName === "users") {
    streamUsers();
  } else {
    streamFirestore();
  }
};

const sourceConnector = { getAllStreams, streamer };

export { sourceConnector, descriptor, validator };


