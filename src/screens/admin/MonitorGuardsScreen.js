import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, ListItem } from '@rneui/themed';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';

export default function MonitorGuardsScreen() {
    const [guards, setGuards] = useState([]);
    const [checkpoints, setCheckpoints] = useState([]);
    const [verifications, setVerifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [companyId, setCompanyId] = useState(null);
    const [expandedGuard, setExpandedGuard] = useState(null);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (userDoc.exists()) {
                    setCompanyId(userDoc.data().companyId);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    useEffect(() => {
        if (!companyId) return;

        const guardsQuery = query(
            collection(db, 'users'),
            where('companyId', '==', companyId),
            where('role', '==', 'guard')
        );

        const checkpointsQuery = query(
            collection(db, 'checkpoints'),
            where('companyId', '==', companyId)
        );

        const verificationsQuery = query(
            collection(db, 'checkpoint_verifications'),
            where('companyId', '==', companyId)
        );

        const unsubGuards = onSnapshot(guardsQuery, (snapshot) => {
            setGuards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        const unsubCheckpoints = onSnapshot(checkpointsQuery, (snapshot) => {
            setCheckpoints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubVerifications = onSnapshot(verificationsQuery, (snapshot) => {
            const verificationsData = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    verifiedAt: doc.data().verifiedAt?.toDate?.() || new Date(doc.data().verifiedAt)
                }))
                .sort((a, b) => b.verifiedAt - a.verifiedAt);
            setVerifications(verificationsData);
        });

        return () => {
            unsubGuards();
            unsubCheckpoints();
            unsubVerifications();
        };
    }, [companyId]);

    const renderGuardItem = ({ item: guard }) => {
        const guardVerifications = verifications.filter(v => v.guardId === guard.id);
        const lastVerification = guardVerifications.length > 0 ?
            guardVerifications[0].verifiedAt.toLocaleTimeString() : 'No verifications';

        return (
            <ListItem.Accordion
                content={
                    <ListItem.Content>
                        <ListItem.Title style={styles.guardName}>{guard.name}</ListItem.Title>
                        <ListItem.Subtitle>{guard.email}</ListItem.Subtitle>
                        <Text style={styles.statsText}>
                            Last Verification: {lastVerification}
                        </Text>
                    </ListItem.Content>
                }
                isExpanded={expandedGuard === guard.id}
                onPress={() => setExpandedGuard(expandedGuard === guard.id ? null : guard.id)}
            >
                <View style={styles.accordionContent}>
                    <Text style={styles.sectionTitle}>Recent Verifications:</Text>
                    {guardVerifications.slice(0, 5).map(verification => {
                        const checkpoint = checkpoints.find(cp => cp.id === verification.checkpointId);
                        return (
                            <ListItem key={verification.id} bottomDivider>
                                <ListItem.Content>
                                    <ListItem.Title>{checkpoint?.name || 'Unknown Checkpoint'}</ListItem.Title>
                                    <ListItem.Subtitle>
                                        {verification.verifiedAt.toLocaleString()}
                                    </ListItem.Subtitle>
                                </ListItem.Content>
                            </ListItem>
                        );
                    })}
                </View>
            </ListItem.Accordion>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Guard Monitoring</Text>
            <FlatList
                data={guards}
                renderItem={renderGuardItem}
                keyExtractor={item => item.id}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text>{loading ? 'Loading...' : 'No guards found'}</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    guardName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statsText: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        padding: 8,
        backgroundColor: '#f9f9f9',
    },
    accordionContent: {
        paddingLeft: 15,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
    }
});