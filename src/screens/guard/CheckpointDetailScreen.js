import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card } from '@rneui/themed';
import * as Location from 'expo-location';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getAuth } from 'firebase/auth';
import { getDistance, isPointWithinRadius } from 'geolib';
import { CHECKPOINT_RADIUS } from '../../config/constants';

export default function CheckpointDetailScreen({ route, navigation }) {
    const { checkpoint, isVerified } = route.params;
    const [location, setLocation] = useState(null);
    const [distance, setDistance] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Update navigation options to show verification status
        navigation.setOptions({
            headerRight: () => (
                isVerified ? (
                    <Icon
                        name="check-circle"
                        type="material"
                        color="#4caf50"
                        size={24}
                        style={{ marginRight: 15 }}
                    />
                ) : null
            )
        });
    }, [navigation, isVerified]);

    useEffect(() => {
        requestLocationPermission();
    }, []);

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required');
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const checkLocation = async () => {
        try {
            setLoading(true);
            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.BestForNavigation,
                maximumAge: 10000,
            });

            // Calculate distance using geolib
            var calculatedDistance = getDistance(
                {
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                },
                {
                    latitude: checkpoint.latitude,
                    longitude: checkpoint.longitude,
                },
                0.1 // Accuracy in meters (0.1m)
            ); // Returns distance in meters

            calculatedDistance = Math.round(calculatedDistance * 100) / 100; // Round to 2 decimal places

            setLocation(currentLocation);
            setDistance(calculatedDistance);

            console.log('Current location:', {
                lat: currentLocation.coords.latitude,
                lon: currentLocation.coords.longitude,
                accuracy: currentLocation.coords.accuracy
            });
            console.log('Checkpoint location:', {
                lat: checkpoint.latitude,
                lon: checkpoint.longitude
            });
            console.log('Calculated distance:', calculatedDistance);

            // Check if within radius using geolib
            const isWithinRange = isPointWithinRadius(
                {
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                },
                {
                    latitude: checkpoint.latitude,
                    longitude: checkpoint.longitude,
                },
                CHECKPOINT_RADIUS
            );

            if (!isWithinRange) {
                Alert.alert('Location Error',
                    `You are too far from the checkpoint (${calculatedDistance} meters away). Must be within ${checkpoint.tolerance} meters.`
                );
                return false;
            }
            return true;
        } catch (error) {
            Alert.alert('Error', 'Failed to get location: ' + error.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const verifyCheckpoint = async () => {
        try {
            setLoading(true);

            // First verify location
            const isLocationValid = await checkLocation();
            if (!isLocationValid) {
                return; // Location check will show its own error message
            }

            // Only check time window after location is verified
            const now = new Date();
            const startTime = new Date(checkpoint.startTime);
            const endTime = new Date(checkpoint.endTime);

            // Check if too early
            if (now < startTime) {
                Alert.alert('Time Window Error', 'Too early to verify this checkpoint. Please return during the scheduled time window.');
                return;
            }

            // Check if too late
            if (now > endTime) {
                Alert.alert('Time Window Error', 'Time window has expired.');
                return;
            }

            // Generate custom verification ID
            const customVerificationId = `VERIF_${Date.now()}`;

            // Get current user and their company ID
            const auth = getAuth();
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            const userCompanyId = userDoc.data().companyId;

            // Create verification with custom ID
            await setDoc(doc(db, 'checkpoint_verifications', customVerificationId), {
                id: customVerificationId,
                checkpointId: checkpoint.id,
                guardId: auth.currentUser.uid,
                companyId: userCompanyId,
                verifiedAt: new Date().toISOString(),
                verifiedLatitude: location.coords.latitude,
                verifiedLongitude: location.coords.longitude,
                createdAt: new Date().toISOString()
            });

            Alert.alert('Success', 'Checkpoint verified successfully');
            navigation.goBack();

        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Card>
                <Card.Title>{checkpoint.name}</Card.Title>
                <Card.Divider />
                <Text style={styles.text}>
                    Time Window: {new Date(checkpoint.startTime).toLocaleTimeString()} - {new Date(checkpoint.endTime).toLocaleTimeString()}
                </Text>
                {checkpoint.isRecurring && (
                    <Text style={styles.text}>
                        Recurs every {checkpoint.recurringHours} hours
                    </Text>
                )}
                <View style={styles.statusContainer}>
                    <Text style={styles.text}>Status: </Text>
                    <Text style={[
                        styles.text,
                        isVerified ? styles.verifiedText : styles.notVerifiedText
                    ]}>
                        {isVerified ? 'Verified' : 'Not Verified'}
                    </Text>
                </View>
                <Text style={styles.text}>
                    Maximum Distance: {CHECKPOINT_RADIUS} meters
                </Text>
                {distance !== null && (
                    <Text style={styles.text}>
                        Current Distance: {distance} meters
                        {distance > CHECKPOINT_RADIUS && (
                            <Text style={styles.errorText}> (Too far)</Text>
                        )}
                    </Text>
                )}
            </Card>

            <View style={styles.buttonContainer}>
                <Button
                    title="Check Location"
                    onPress={checkLocation}
                    loading={loading}
                    containerStyle={styles.button}
                />
                <Button
                    title="Verify Checkpoint"
                    onPress={verifyCheckpoint}
                    loading={loading}
                    disabled={isVerified}
                    containerStyle={styles.button}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    verifiedText: {
        fontWeight: 'bold',
        color: '#4caf50'  // Green
    },
    notVerifiedText: {
        fontWeight: 'bold',
        color: '#f44336'  // Red
    },
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    text: {
        marginBottom: 10,
        fontSize: 16,
    },
    errorText: {
        color: 'red',
    },
    buttonContainer: {
        marginTop: 20,
    },
    button: {
        marginVertical: 10,
    },
});
