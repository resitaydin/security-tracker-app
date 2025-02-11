import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView } from 'react-native';
import { Text, ListItem, Card, Badge, Divider } from '@rneui/themed';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';

const getStatusColor = (status) => {
    switch (status) {
        case 'verified_ontime': return '#4caf50';  // Green
        case 'verified_late': return '#ff9800';    // Orange
        case 'missed': return '#f44336';          // Red
        case 'upcoming': return '#757575';        // Grey
        case 'active': return '#2196f3';          // Blue
        default: return '#757575';
    }
};

export default function MonitorGuardsScreen() {
    const [guards, setGuards] = useState([]);
    const [checkpoints, setCheckpoints] = useState([]);
    const [verifications, setVerifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [companyId, setCompanyId] = useState(null);
    const [expandedGuard, setExpandedGuard] = useState(null);

    // Add stats for each guard
    const [guardStats, setGuardStats] = useState({});

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

        const unsubscribe = onSnapshot(guardsQuery, (guardSnapshot) => {
            const guardData = guardSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGuards(guardData);

            // Get checkpoints
            onSnapshot(checkpointsQuery, (checkpointSnapshot) => {
                const checkpointData = checkpointSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCheckpoints(checkpointData);

                // Get verifications and calculate stats
                onSnapshot(verificationsQuery, (verificationSnapshot) => {
                    const verificationData = verificationSnapshot.docs
                        .map(doc => ({
                            id: doc.id,
                            ...doc.data(),
                            verifiedAt: new Date(doc.data().verifiedAt)
                        }));
                    setVerifications(verificationData);

                    // Calculate stats only when we have all data
                    calculateGuardStats(verificationData, guardData, checkpointData);
                });
            });
        });

        setLoading(false);
        return () => unsubscribe();
    }, [companyId]);

    const calculateGuardStats = (verificationData, guardList, checkpointList) => {
        const stats = {};

        // Initialize stats for each guard
        guardList.forEach(guard => {
            const guardVerifications = verificationData.filter(v => v.guardId === guard.id);

            stats[guard.id] = {
                ontime: guardVerifications.filter(v => v.status === 'verified_ontime').length,
                late: guardVerifications.filter(v => v.status === 'verified_late').length,
                missed: 0,
                upcoming: 0
            };

            // Calculate missed and upcoming for each checkpoint
            checkpointList.forEach(checkpoint => {
                const now = new Date();
                const startTime = new Date(checkpoint.startTime);
                const endTime = new Date(checkpoint.endTime);

                // Check if guard has verified this checkpoint
                const hasVerified = guardVerifications.some(v =>
                    v.checkpointId === checkpoint.id &&
                    new Date(v.verifiedAt) >= startTime &&
                    new Date(v.verifiedAt) <= endTime
                );

                if (!hasVerified) {
                    if (now > endTime) {
                        stats[guard.id].missed++;
                    } else if (now < startTime) {
                        stats[guard.id].upcoming++;
                    }
                }
            });
        });

        setGuardStats(stats);
    };

    const renderCheckpointStatus = (guard, checkpoint) => {
        const now = new Date();
        const startTime = new Date(checkpoint.startTime);
        const endTime = new Date(checkpoint.endTime);

        const verification = verifications.find(v =>
            v.guardId === guard.id &&
            v.checkpointId === checkpoint.id &&
            v.verifiedAt >= startTime &&
            v.verifiedAt <= endTime
        );

        let status = 'upcoming';
        if (verification) {
            status = verification.status;
        } else if (now > endTime) {
            status = 'missed';
        } else if (now >= startTime && now <= endTime) {
            status = 'active';
        }

        return (
            <Badge
                value={status.replace('_', ' ').toUpperCase()}
                status={status === 'verified_ontime' ? 'success' :
                    status === 'verified_late' ? 'warning' :
                        status === 'missed' ? 'error' :
                            status === 'active' ? 'primary' : 'grey'}
                containerStyle={styles.badge}
            />
        );
    };

    const renderGuardItem = ({ item: guard }) => {
        const stats = guardStats[guard.id] || {
            totalVerifications: 0,
            ontime: 0,
            late: 0,
            missed: 0,
            upcoming: 0
        };

        return (
            <Card>
                <ListItem.Accordion
                    content={
                        <View style={styles.accordionHeader}>
                            <View>
                                <ListItem.Title style={styles.guardName}>{guard.name}</ListItem.Title>
                                <ListItem.Subtitle>{guard.email}</ListItem.Subtitle>
                            </View>
                            <View style={styles.statsOverview}>
                                <Badge value={`${stats.ontime} ✓`} status="success" />
                                <Badge value={`${stats.late} ⚠`} status="warning" />
                                <Badge value={`${stats.missed} ✗`} status="error" />
                            </View>
                        </View>
                    }
                    isExpanded={expandedGuard === guard.id}
                    onPress={() => setExpandedGuard(expandedGuard === guard.id ? null : guard.id)}
                >
                    <View style={styles.accordionContent}>
                        <View style={styles.statsContainer}>
                            <Text style={styles.statTitle}>Performance Summary</Text>
                            <View style={styles.statsGrid}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{stats.ontime}</Text>
                                    <Text style={styles.statLabel}>On Time</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{stats.late}</Text>
                                    <Text style={styles.statLabel}>Late</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{stats.missed}</Text>
                                    <Text style={styles.statLabel}>Missed</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{stats.upcoming}</Text>
                                    <Text style={styles.statLabel}>Upcoming</Text>
                                </View>
                            </View>
                        </View>

                        <Divider style={styles.divider} />

                        <Text style={styles.sectionTitle}>Checkpoint Status</Text>
                        {checkpoints.map(checkpoint => (
                            <ListItem key={checkpoint.id} bottomDivider>
                                <ListItem.Content>
                                    <ListItem.Title>{checkpoint.name}</ListItem.Title>
                                    <ListItem.Subtitle>
                                        {`${new Date(checkpoint.startTime).toLocaleTimeString()} - ${new Date(checkpoint.endTime).toLocaleTimeString()}`}
                                    </ListItem.Subtitle>
                                </ListItem.Content>
                                {renderCheckpointStatus(guard, checkpoint)}
                            </ListItem>
                        ))}
                    </View>
                </ListItem.Accordion>
            </Card>
        );
    };

    return (
        <View style={styles.container}>
            <Text h4 style={styles.header}>Guard Monitoring</Text>
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
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    accordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flex: 1,
    },
    guardName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statsOverview: {
        flexDirection: 'row',
        gap: 8,
    },
    accordionContent: {
        paddingHorizontal: 15,
        backgroundColor: '#fff',
    },
    statsContainer: {
        marginVertical: 10,
    },
    statTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1976D2',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginVertical: 10,
    },
    badge: {
        marginLeft: 8,
    },
    divider: {
        marginVertical: 10,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
    },
});