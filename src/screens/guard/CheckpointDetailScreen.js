import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card, Icon } from '@rneui/themed';
import * as Location from 'expo-location';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { getDistance, isPointWithinRadius } from 'geolib';
import { CHECKPOINT_RADIUS } from '../../config/constants';
import AppBar from '../../components/AppBar';
import { useTranslation } from 'react-i18next';

export default function CheckpointDetailScreen({ route, navigation }) {
    const { checkpoint } = route.params;
    const [location, setLocation] = useState(null);
    const [distance, setDistance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [verificationData, setVerificationData] = useState(
        route.params.verificationData ? {
            ...route.params.verificationData,
            verifiedAt: route.params.verificationData.verifiedAt ?
                new Date(route.params.verificationData.verifiedAt) :
                new Date()
        } : null
    );
    const { t } = useTranslation();

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                verificationData ? (
                    <Icon
                        name="check-circle"
                        type="material"
                        color={verificationData.status === 'verified_ontime' ? '#4caf50' : '#ff9800'}
                        size={24}
                        style={{ marginRight: 15 }}
                    />
                ) : null
            )
        });
    }, [navigation, verificationData]);

    useEffect(() => {
        requestLocationPermission();
    }, []);

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('guard.permissionDenied'), t('guard.locationPermissionRequired'));
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
            );

            calculatedDistance = Math.round(calculatedDistance * 100) / 100; // Round to 2 decimal places

            setLocation(currentLocation);
            setDistance(calculatedDistance);

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
                Alert.alert(t('guard.locationError'),
                    t('guard.tooFarFromCheckpoint', {
                        distance: calculatedDistance,
                        radius: CHECKPOINT_RADIUS
                    })
                );
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
            // Check if location is already available, if not, get it
            if (!location) {
                const isLocationValid = await checkLocation();
                if (!isLocationValid) return;
            }

            // Verify that location exists after potential check
            if (!location) {
                Alert.alert('Error', 'Please check your location first');
                return;
            }

            const now = new Date();
            const startTime = new Date(checkpoint.startTime);
            const endTime = new Date(checkpoint.endTime);

            // Get company settings for late window
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            const companyId = userDoc.data().companyId;
            const companyDoc = await getDoc(doc(db, 'companies', companyId)); const lateWindowMinutes = companyDoc.data()?.lateWindowMinutes || 15;

            // Calculate late window end time
            const lateWindowEnd = new Date(endTime);
            lateWindowEnd.setMinutes(lateWindowEnd.getMinutes() + lateWindowMinutes);

            // Check time windows
            let verificationStatus;
            if (now < startTime) {
                Alert.alert(t('guard.timeWindowError'), t('guard.tooEarly'));
                return;
            } else if (now > lateWindowEnd) {
                Alert.alert(t('guard.timeWindowError'), t('guard.timeExpired'));
                return;
            } else if (now > endTime) {
                verificationStatus = 'verified_late';
            } else {
                verificationStatus = 'verified_ontime';
            }

            const verificationId = `VERIF_${Date.now()}_${auth.currentUser.uid}`;
            const verificationDataObj = {
                id: verificationId,
                checkpointId: checkpoint.id,
                guardId: auth.currentUser.uid,
                companyId: companyId,
                verifiedAt: now.toISOString(),
                status: verificationStatus,
                verifiedLatitude: location.coords.latitude,
                verifiedLongitude: location.coords.longitude,
                createdAt: now.toISOString()
            };

            const verificationRef = doc(db, 'checkpoint_verifications', verificationId);
            await setDoc(verificationRef, verificationDataObj);

            // Verify the save was successful
            const verificationDoc = await getDoc(verificationRef);
            if (!verificationDoc.exists()) {
                throw new Error('Verification failed to save');
            }

            setVerificationData({
                ...verificationDataObj,
                verifiedAt: now
            })

            Alert.alert(
                t('common.success'),
                verificationStatus === 'verified_late'
                    ? t('guard.checkpointVerifiedLate')
                    : t('guard.checkpointVerified'),
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                    }
                ]
            );

        } catch (error) {
            console.error('Verification error:', error);
            Alert.alert(t('common.error'), t('guard.verificationError', { message: error.message }));
            setVerificationData(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <AppBar
                title={t('guard.checkpoints')}
                leftComponent={{
                    icon: 'arrow-back',
                    color: '#fff',
                    onPress: () => navigation.goBack()
                }}
            />
            <View style={styles.content}>
                <Card>
                    <Card.Title>{checkpoint.name}</Card.Title>
                    <Card.Divider />
                    <Text style={styles.text}>
                        {t('guard.timeWindow')}: {new Date(checkpoint.startTime).toLocaleTimeString()} - {new Date(checkpoint.endTime).toLocaleTimeString()}
                    </Text>
                    {checkpoint.isRecurring && (
                        <Text style={styles.text}>
                            {checkpoint.isRecurring && t('guard.recurringEvery', { hours: checkpoint.recurringHours })}
                        </Text>
                    )}
                    <View style={styles.statusContainer}>
                        <Text style={styles.text}>{t('guard.status')}: </Text>
                        <Text style={[
                            styles.text,
                            verificationData ? styles.verifiedText : styles.notVerifiedText
                        ]}>
                            {verificationData ? t('guard.verified') : t('guard.notVerified')}
                        </Text>
                    </View>
                    <Text style={styles.text}>
                        {t('guard.maximumDistance', { radius: CHECKPOINT_RADIUS })}
                    </Text>
                    {distance !== null && (
                        <Text style={styles.text}>
                            {t('guard.currentDistance', { distance })}
                            {distance > CHECKPOINT_RADIUS && (
                                <Text style={styles.errorText}> (Too far)</Text>
                            )}
                        </Text>
                    )}
                </Card>

                <View style={styles.buttonContainer}>
                    <Button
                        title={t('guard.checkLocation')}
                        onPress={checkLocation}
                        loading={loading}
                        containerStyle={styles.button}
                    />
                    <Button
                        title={t('guard.verify')}
                        onPress={verifyCheckpoint}
                        loading={loading}
                        disabled={!!verificationData || distance === null}
                        containerStyle={styles.button}
                    />
                </View>
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
        backgroundColor: '#fff',
    },
    content: {  // Add this new style
        padding: 16,
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
