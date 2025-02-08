import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, ListItem, Icon } from '@rneui/themed';
import { signOut } from 'firebase/auth';
import { collection, query, onSnapshot, where, getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

const getStatusColor = (status) => {
    switch (status) {
        case 'Pending': return '#ffd700';
        case 'Checked': return '#4caf50';
        case 'Late': return '#ff9800';
        case 'Past': return '#f44336';
        default: return '#grey';
    }
};

export default function GuardHomeScreen({ navigation }) {
    const [checkpoints, setCheckpoints] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCheckpoints = async () => {
            try {
                // Get current user's company ID
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (!userDoc.exists()) {
                    throw new Error('User data not found');
                }
                const userCompanyId = userDoc.data().companyId;

                // Subscribe to checkpoints filtered by company ID
                const checkpointsQuery = query(
                    collection(db, 'checkpoints'),
                    where('companyId', '==', userCompanyId)
                );

                const unsubscribe = onSnapshot(checkpointsQuery, (snapshot) => {
                    const checkpointList = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setCheckpoints(checkpointList);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('Error fetching checkpoints:', error);
                setLoading(false);
            }
        };

        fetchCheckpoints();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const renderCheckpoint = ({ item }) => (
        <ListItem
            bottomDivider
            onPress={() => navigation.navigate('CheckpointDetail', { checkpoint: item })}
        >
            <Icon
                name="location-pin"
                type="material"
                color={getStatusColor(item.status)}
            />
            <ListItem.Content>
                <ListItem.Title>{item.name}</ListItem.Title>
                <ListItem.Subtitle>
                    {`Time: ${new Date(item.startTime).toLocaleTimeString()} - ${new Date(item.endTime).toLocaleTimeString()}`}
                    {'\nStatus: ' + item.status}
                </ListItem.Subtitle>
            </ListItem.Content>
            <ListItem.Chevron />
        </ListItem>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text h4>Checkpoints</Text>
                <Button
                    title="Logout"
                    type="clear"
                    onPress={handleLogout}
                />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <Text>Loading checkpoints...</Text>
                </View>
            ) : checkpoints.length === 0 ? (
                <View style={styles.center}>
                    <Text>No checkpoints available</Text>
                </View>
            ) : (
                <FlatList
                    data={checkpoints}
                    renderItem={renderCheckpoint}
                    keyExtractor={item => item.id}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
}); 