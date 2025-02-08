import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const updateCheckpointsStatus = async () => {
    try {
        // Query all pending checkpoints
        const pendingQuery = query(
            collection(db, 'checkpoints'),
            where('status', '==', 'Pending')
        );

        const snapshot = await getDocs(pendingQuery);
        const now = new Date();

        for (const doc of snapshot.docs) {
            const checkpoint = { id: doc.id, ...doc.data() };
            const endTime = new Date(checkpoint.endTime);

            // If the checkpoint has passed its end time, update status to 'Past'
            if (now > endTime) {
                await updateDoc(doc.ref, { status: 'Late' });
            }
        }
    } catch (error) {
        console.error('Error updating checkpoints status:', error);
    }
};
