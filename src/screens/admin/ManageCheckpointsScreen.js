import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, Input, ListItem, Icon, Overlay } from '@rneui/themed';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, setDoc, deleteDoc, doc, onSnapshot, query, where, getDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { CHECKPOINT_RADIUS } from '../../config/constants';
import { createRecurringCheckpoints } from '../../utils/checkpointUtils';

export default function ManageCheckpointsScreen() {
    const [checkpoints, setCheckpoints] = useState([]);
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [recurringHours, setRecurringHours] = useState('0'); // 0 means no recurrence

    // Get company ID from current user
    const [companyId, setCompanyId] = useState(null);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (userDoc.exists()) {
                    setCompanyId(userDoc.data().companyId);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, []);

    useEffect(() => {
        if (!companyId) return;

        const checkpointsRef = collection(db, 'checkpoints');
        const q = query(checkpointsRef, where('companyId', '==', companyId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const checkpointList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCheckpoints(checkpointList);
        });

        return () => unsubscribe();
    }, [companyId]);

    const getCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required');
                return null;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.BestForNavigation,
                maximumAge: 10000,
            });

            console.log('Creating checkpoint at location:', {
                lat: location.coords.latitude,
                lon: location.coords.longitude,
                accuracy: location.coords.accuracy
            });

            return location;
        } catch (error) {
            Alert.alert('Error', 'Failed to get location: ' + error.message);
            return null;
        }
    };

    const validateInput = () => {
        if (!name.trim()) {
            Alert.alert("Validation Error", "Please enter a checkpoint name.");
            return false;
        }
        if (startTime >= endTime) {
            Alert.alert("Validation Error", "Start time must be before End time.");
            return false;
        }
        return true;
    };

    const handleAddCheckpoint = async () => {
        try {
            if (!validateInput()) return;
            setLoading(true);
            const location = await getCurrentLocation();
            if (!location) return;

            const recHours = parseInt(recurringHours);
            if (isNaN(recHours) || recHours < 0) {
                Alert.alert("Error", "Recurrence hours must be a non-negative number");
                return;
            }

            // Create main checkpoint with custom ID
            const customCheckpointId = `CP_${Date.now()}`;
            const checkpointData = {
                id: customCheckpointId,
                name: name.trim(),
                companyId,
                creatorId: auth.currentUser.uid,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                status: 'active',
                radius: CHECKPOINT_RADIUS,
                recurringHours: recHours,
                isRecurring: recHours > 0,
                lastRecurrence: null,
                createdAt: new Date().toISOString()
            };

            // Create the main checkpoint
            await setDoc(doc(db, 'checkpoints', customCheckpointId), checkpointData);

            // Create recurring checkpoints if applicable
            if (checkpointData.isRecurring) {
                await createRecurringCheckpoints(checkpointData);
            }

            setIsVisible(false);
            resetForm();
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCheckpoint = async (id) => {
        try {
            Alert.alert(
                'Delete Checkpoint',
                'Are you sure you want to delete this checkpoint?',
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                    },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            await deleteDoc(doc(db, 'checkpoints', id));
                        },
                    },
                ]
            );
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const resetForm = () => {
        setName('');
        setStartTime(new Date());
        setEndTime(new Date());
    };

    const renderCheckpoint = ({ item }) => (
        <ListItem bottomDivider>
            <ListItem.Content>
                <ListItem.Title>{item.name}</ListItem.Title>
                <ListItem.Subtitle>
                    {`Time: ${new Date(item.startTime).toLocaleTimeString()} - ${new Date(item.endTime).toLocaleTimeString()}`}
                </ListItem.Subtitle>
                <ListItem.Subtitle>
                    Status: {item.status}
                </ListItem.Subtitle>
                <ListItem.Subtitle>
                    {item.isRecurring ? `Recurs every ${item.recurringHours} hours` : 'No recurrence'}
                </ListItem.Subtitle>
            </ListItem.Content>
            <Icon
                name="delete"
                type="material"
                color="red"
                onPress={() => handleDeleteCheckpoint(item.id)}
            />
        </ListItem>
    );

    return (
        <View style={styles.container}>
            <Button
                title="Add New Checkpoint"
                onPress={() => setIsVisible(true)}
                containerStyle={styles.addButton}
            />

            {/* List of checkpoints */}
            {checkpoints && (
                <View>
                    {checkpoints.map(item => (
                        <View key={item.id}>
                            {renderCheckpoint({ item })}
                        </View>
                    ))}
                </View>
            )}

            <Overlay
                isVisible={isVisible}
                onBackdropPress={() => setIsVisible(false)}
                overlayStyle={styles.overlay}
            >
                <Text h4 style={styles.overlayTitle}>Add New Checkpoint</Text>

                <Input
                    placeholder="Checkpoint Name"
                    value={name}
                    onChangeText={setName}
                />
                <Input
                    placeholder="Recurrence (hours, 0 for none)"
                    value={recurringHours}
                    onChangeText={setRecurringHours}
                    keyboardType="numeric"
                />

                <Button
                    title={`Start Time: ${startTime.toLocaleTimeString()}`}
                    onPress={() => setShowStartPicker(true)}
                    type="outline"
                    containerStyle={styles.timeButton}
                />

                <Button
                    title={`End Time: ${endTime.toLocaleTimeString()}`}
                    onPress={() => setShowEndPicker(true)}
                    type="outline"
                    containerStyle={styles.timeButton}
                />

                {showStartPicker && (
                    <DateTimePicker
                        value={startTime}
                        mode="time"
                        is24Hour={true}
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowStartPicker(false);
                            if (selectedDate) setStartTime(selectedDate);
                        }}
                    />
                )}

                {showEndPicker && (
                    <DateTimePicker
                        value={endTime}
                        mode="time"
                        is24Hour={true}
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowEndPicker(false);
                            if (selectedDate) setEndTime(selectedDate);
                        }}
                    />
                )}

                <View style={styles.buttonContainer}>
                    <Button
                        title="Cancel"
                        onPress={() => {
                            setIsVisible(false);
                            resetForm();
                        }}
                        type="outline"
                        containerStyle={styles.button}
                    />
                    <Button
                        title="Add"
                        onPress={handleAddCheckpoint}
                        loading={loading}
                        containerStyle={styles.button}
                    />
                </View>
            </Overlay>
        </View>
    );
}

const styles = StyleSheet.create({
    recurrenceContainer: {
        marginVertical: 10,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 10,
        paddingHorizontal: 10,
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 20
    },
    addButton: {
        margin: 16,
    },
    overlay: {
        width: '90%',
        padding: 20,
    },
    overlayTitle: {
        textAlign: 'center',
        marginBottom: 20,
    },
    timeButton: {
        marginVertical: 10,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
    },
    button: {
        width: '40%',
    },
});
