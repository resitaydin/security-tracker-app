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

export const handleCheckpointRecurrence = (checkpoint) => {
    if (!checkpoint.isRecurring || !checkpoint.recurringHours || checkpoint.recurringHours <= 0) {
        return null;
    }

    const now = new Date();
    const startTime = new Date(checkpoint.startTime);
    const endTime = new Date(checkpoint.endTime);
    const lastRecurrence = checkpoint.lastRecurrence ? new Date(checkpoint.lastRecurrence) : null;
    const recurringHours = parseInt(checkpoint.recurringHours);

    // Add a check for minimum time between updates (e.g., 5 minutes)
    if (lastRecurrence && (now - lastRecurrence) < (5 * 60 * 1000)) {
        return null;
    }

    // If the checkpoint's end time has passed
    if (now > endTime) {
        // Calculate how many recurrence periods have passed
        const hoursSinceStart = Math.floor((now - startTime) / (1000 * 60 * 60));
        const periodsToAdd = Math.ceil(hoursSinceStart / recurringHours);

        const newStartTime = new Date(startTime);
        newStartTime.setHours(startTime.getHours() + (periodsToAdd * recurringHours));

        const newEndTime = new Date(endTime);
        newEndTime.setHours(endTime.getHours() + (periodsToAdd * recurringHours));

        return {
            startTime: newStartTime.toISOString(),
            endTime: newEndTime.toISOString(),
            lastRecurrence: now.toISOString()
        };
    }

    return null;
};
export const filterCheckpointsForTimeWindow = (checkpoints) => {
    const now = new Date();
    const threeHoursAgo = new Date(now);
    threeHoursAgo.setHours(now.getHours() - 18);

    const twentyOneHoursAhead = new Date(now);
    twentyOneHoursAhead.setHours(now.getHours() + 18);

    return checkpoints.filter(checkpoint => {
        const checkpointStart = new Date(checkpoint.startTime);
        const checkpointEnd = new Date(checkpoint.endTime);

        // Show checkpoint if:
        // 1. Start time is within our 24-hour window OR
        // 2. End time is within our 24-hour window OR
        // 3. The checkpoint spans our window
        return (checkpointStart >= threeHoursAgo && checkpointStart <= twentyOneHoursAhead) ||
            (checkpointEnd >= threeHoursAgo && checkpointEnd <= twentyOneHoursAhead) ||
            (checkpointStart <= threeHoursAgo && checkpointEnd >= twentyOneHoursAhead);
    });
};