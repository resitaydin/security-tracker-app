import { collection, query, where, getDocs, updateDoc, setDoc, doc, getDoc } from 'firebase/firestore';
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

export const createRecurringCheckpoints = async (checkpoint) => {
    if (!checkpoint.isRecurring || !checkpoint.recurringHours || checkpoint.recurringHours <= 0) {
        return [];
    }

    const now = new Date();
    const startTime = new Date(checkpoint.startTime);
    const recurringHours = parseInt(checkpoint.recurringHours);
    const newCheckpoints = [];

    // Generate base ID once
    const baseTimestamp = Date.now();

    // Calculate how many periods fit within 24 hours
    const maxPeriods = Math.floor(24 / recurringHours);

    // Create new checkpoints for each period
    for (let i = 1; i <= maxPeriods; i++) {
        const newStartTime = new Date(startTime);
        newStartTime.setHours(startTime.getHours() + (i * recurringHours));

        const newEndTime = new Date(checkpoint.endTime);
        newEndTime.setHours(newEndTime.getHours() + (i * recurringHours));

        // Skip if the new checkpoint would start more than 24 hours ahead
        if (newStartTime > new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
            break;
        }

        // Create new checkpoint with consistent ID format
        const newCheckpointId = `CP_${baseTimestamp}_${i}`;

        // Check if checkpoint with this ID already exists
        const existingDoc = await getDoc(doc(db, 'checkpoints', newCheckpointId));
        if (existingDoc.exists()) {
            console.log(`Checkpoint ${newCheckpointId} already exists, skipping...`);
            continue;
        }

        const newCheckpoint = {
            ...checkpoint,
            id: newCheckpointId,
            startTime: newStartTime.toISOString(),
            endTime: newEndTime.toISOString(),
            isRecurringInstance: true,
            originalCheckpointId: checkpoint.id,
            createdAt: now.toISOString()
        };

        try {
            await setDoc(doc(db, 'checkpoints', newCheckpointId), newCheckpoint);
            newCheckpoints.push(newCheckpoint);
        } catch (error) {
            console.error('Error creating recurring checkpoint:', error);
        }
    }

    // Update the original checkpoint's lastRecurrence
    if (newCheckpoints.length > 0) {
        try {
            await updateDoc(doc(db, 'checkpoints', checkpoint.id), {
                lastRecurrence: now.toISOString()
            });
        } catch (error) {
            console.error('Error updating original checkpoint:', error);
        }
    }

    return newCheckpoints;
};
export const filterCheckpointsForTimeWindow = (checkpoints) => {
    const now = new Date();
    const threeHoursAgo = new Date(now);
    threeHoursAgo.setHours(now.getHours() - 24);

    const twentyOneHoursAhead = new Date(now);
    twentyOneHoursAhead.setHours(now.getHours() + 24);

    return checkpoints.filter(checkpoint => {
        const checkpointStart = new Date(checkpoint.startTime);
        const checkpointEnd = new Date(checkpoint.endTime);

        return (checkpointStart >= threeHoursAgo && checkpointStart <= twentyOneHoursAhead) ||
            (checkpointEnd >= threeHoursAgo && checkpointEnd <= twentyOneHoursAhead) ||
            (checkpointStart <= threeHoursAgo && checkpointEnd >= twentyOneHoursAhead);
    });
};