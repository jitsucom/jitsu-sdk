import { FirestoreStreamConfig } from "./index";
import { App } from "firebase-admin/app";
import { getFirestore, CollectionReference, DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { StreamSink } from "@jitsu/types/sources";
import * as console from "console";

const readCollection = async (
  collection: () => CollectionReference<DocumentData>,
  callback: (doc: QueryDocumentSnapshot) => void,
  sink: StreamSink
) => {
  let offset = 0;
  const limit = 2;
  let docs = await collection().limit(limit).offset(offset).get();
  while (docs.size > 0) {
    sink.log("INFO", `Processing ${docs.size} documents`);
    docs.forEach(callback);
    offset += docs.size;
    docs = await collection().limit(limit).offset(offset).get();
    if (docs.size === 0) {
      sink.log("INFO", `Processing finished. Processed ${offset} docs in total`);
    }
  }
};

export async function streamFirestore(firebaseApp: App, streamConfiguration: FirestoreStreamConfig, sink: StreamSink) {
  let collectionName = streamConfiguration.collection;

  const [collection, subCollection] = collectionName.split("/*/");
  sink.clearStream();
  sink.log("INFO", `Reading firestore collection ${collection}`);
  await readCollection(
    () => getFirestore(firebaseApp).collection(collection),
    (doc: QueryDocumentSnapshot) => {
      if (subCollection) {
        sink.log("INFO", `Reading firestore sub-collection ${collection}/${subCollection} of document ${doc.id}`);
        readCollection(
          () => doc.ref.collection(subCollection),
          subDoc => {
            sink.addRecord({
              __id: doc.id + "/" + subDoc.id,
              _firestore_document_id: doc.id,
              [`_firestore_document_id_${subCollection.toLocaleLowerCase()}`]: subDoc.id,
              ...doc.data(),
            });
          },
          sink
        );
        doc.ref.collection(subCollection);
      } else {
        sink.addRecord({
          __id: doc.id,
          _firestore_document_id: doc.id,
          ...doc.data(),
        });
      }
    },
    sink
  );
}
