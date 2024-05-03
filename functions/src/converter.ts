import { FirestoreDataConverter, WithFieldValue, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';

export const converter = <T extends DocumentData>(): FirestoreDataConverter<T> => ({
    toFirestore: (data: WithFieldValue<T>) => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot<T>) => snapshot.data(),
  });