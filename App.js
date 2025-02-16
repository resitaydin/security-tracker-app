import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { auth, db } from './src/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { LanguageProvider } from './src/contexts/LanguageContext';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

// Guard Screens
import GuardHomeScreen from './src/screens/guard/GuardHomeScreen';
import CheckpointDetailScreen from './src/screens/guard/CheckpointDetailScreen';

// Admin Screens
import AdminHomeScreen from './src/screens/admin/AdminHomeScreen';
import ManageCheckpointsScreen from './src/screens/admin/ManageCheckpointsScreen';
import MonitorGuardsScreen from './src/screens/admin/MonitorGuardsScreen';

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initLanguage = async () => {
      const language = await AsyncStorage.getItem('userLanguage');
      if (language) {
        i18next.changeLanguage(language);
      }
    };
    initLanguage();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('User logged in:', user.uid);
        setUser(user);

        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          console.log('User doc exists:', userDoc.exists());
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('User role:', userData.role);
            setIsAdmin(userData.role === 'admin');
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
        }
      } else {
        console.log('No user logged in');
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <LanguageProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            // Auth Stack
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          ) : isAdmin ? (
            // Admin Stack
            <>
              <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
              <Stack.Screen name="ManageCheckpoints" component={ManageCheckpointsScreen} />
              <Stack.Screen name="Monitoring" component={MonitorGuardsScreen} />
            </>
          ) : (
            // Guard Stack
            <>
              <Stack.Screen name="GuardHome" component={GuardHomeScreen} />
              <Stack.Screen name="CheckpointDetail" component={CheckpointDetailScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </LanguageProvider>
  );
}
