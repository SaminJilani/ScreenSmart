
import { DrawerActions, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import type {PropsWithChildren} from 'react';
import {
  Button,
  Image,
  NativeModules,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import MainScreen from './src/screens/MainScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CustomTabBar } from './src/HelperFunctions/helperJSX';
import { Provider } from 'react-redux';
import { store } from './src/Redux/store';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import AppUsageLimitScreen from './src/screens/AppUsageLimit';
import { height, screenWidth, width } from './src/units';
import { colors, fonts, icons } from './src/assets';
import { storage } from './src/AsyncStorageHelper';
import { initiateAppUsageLimits } from './src/HelperFunctions/helperFunctions';
import UsageStatistics from './src/screens/UsageStatistics';
import AppUsageDetails from './src/screens/AppUsageDetails';
import AppSessionInfo from './src/screens/AppSessionInfo';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Pressable } from '@react-native-material/core';
import UsageSessionInfo from './src/screens/UsageSessionInfo';

const { AppUsageModule } = NativeModules;



const Root = createNativeStackNavigator();
const Apps = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const Drawer = createDrawerNavigator();

const CustomDrawerContent = (props) => {
    return (
      <DrawerContentScrollView {...props}>
        <View style={styles.drawerHeader}>
           <Image source={icons.appIcon} style={{width:width*26,height:height*12,resizeMode:'contain'}} />
          <Text style={styles.headerText}>Screen Smart</Text>
        </View>
      <Pressable style={styles.logoutButton} 
        onPress={() =>
          {props?.navigation?.navigate('AppUsageLimitScreen')}}>
            <MaterialIcons name={"lock-clock"} color={"black"} size={25}/> 
          <Text style={styles.firstText}>App Usage Limits</Text>
      </Pressable>
      </DrawerContentScrollView>
    );
};

const CustomHeader = ({ title, navigation }) => {
  return (
    <View style={styles.headerContainer}>
      <View style={{marginLeft: 15,position:'absolute',top:12,left:0}}>
      <Pressable onPress={() => navigation.toggleDrawer()} 
          >
            <Ionicons name="menu" size={25} color={colors.primary} />
          </Pressable>
          </View>
      <View 
      style={{
        alignSelf:'center',
        alignItems:'center',
        justifyContent:'center',
        flexDirection:'row',
        
      }}
      >
          <Image source={icons.appIcon} style={{width:width*10,height:height*5,resizeMode:'contain'}} />
          <Text style={styles.headerTitle}>{title}</Text>
      </View>
    </View>
  );
};


const FetchUsageLimitApps = async () => {
    try {
      const list = await storage.getString('usage_limit_apps');
      if(list && JSON.parse(list).length>0){
        const result = JSON.parse(list).map(({appName, packageName,allowedTimeLimit}) => ({appName, packageName,allowedTimeLimit}));
        console.log(`FetchUsageLimitApps RootStack ${JSON.stringify(result)}`)
        initiateAppUsageLimits(result);
      }
      else{
        console.log(`FetchUsageLimitApps2 RootStack ${list}`)
      }
   
      // START SERVICE HERE!
    } catch (error) {
      console.log(`FetchUsageLimitApps error==> ${error}`);
    }
  };

const NotificationService = async () => {
    try {
      
      await AppUsageModule.startUsageNotificationService();
      // await AppUsageModule.stopUsageNotificationService();
      // START SERVICE HERE!
    } catch (error) {
      console.log(`NotificationService error==> ${error}`);
    }
  };

export const RootStack = () => {

NotificationService();
FetchUsageLimitApps();
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      // screenOptions={{
      //   headerShown: true,
      //   swipeEdgeWidth: 0,
      // }}
      screenOptions={({ navigation }) => ({
        header: ({ route }) => (
          <CustomHeader title={'Screen Smart'} navigation={navigation} />
        ),
        swipeEdgeWidth: 0,
      })}
      drawerContent={props => <CustomDrawerContent {...props} />}
      >
      <Drawer.Screen name="Home" component={TabsNavigation} />
      <Drawer.Screen name="AppUsageLimitScreen" component={AppUsageLimitScreen} />
    </Drawer.Navigator>
  );
};


export const AppStack = () => {
  return (
    <Apps.Navigator
      initialRouteName="MainScreen"
      screenOptions={{
        headerShown: false,
      }}>
      <Apps.Screen name="MainScreen" component={MainScreen} />
      <Apps.Screen name="UsageStatistics" component={UsageStatistics} options={{animation: 'fade'}}/>
      <Apps.Screen name="UsageSessionInfo" component={UsageSessionInfo} />
      <Apps.Screen name="AppUsageDetails" component={AppUsageDetails} options={{animation: 'fade'}}/>
      <Apps.Screen name="AppSessionInfo" component={AppSessionInfo} />
      
      
      
    </Apps.Navigator>
  );
};

const TabsNavigation = () => {
  return(
  <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} initialRouteName='MainTab' screenOptions={{headerShown: false}} >
    <Tab.Screen component={AppStack} name="MainTab" />
  </Tab.Navigator>
  )
}

// const RootStack = () => {
//   return (
//     <Root.Navigator initialRouteName='Home' screenOptions={{headerShown: false}}>
//         <Root.Screen name="Home" component={TabsNavigation} />
//     </Root.Navigator>
//   );
// };

const Navigation = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootStack />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const  App = () => {

  return (
    <Provider store={store}>
    <Navigation/>
    </Provider>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  drawerHeader: {
    height: height*21,
    backgroundColor: colors.white,
    borderBottomWidth:0.5,
    elevation:1.5,
    borderColor:colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color:colors.primary
  },
  logoutButton: {
    marginTop: height*5,
    // padding: 10,
    marginLeft: width*7,
    backgroundColor: '#ffff',
    flexDirection:'row'
  },
  firstText: {
    color: '#000',
    fontSize: 16,
    marginLeft:width*2,
    fontFamily:fonts.notosans
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:'center',
    backgroundColor: colors.white,
    width:screenWidth,
    height: height*7.2,
    paddingHorizontal: 10,
  },
  headerTitle: {
    color: colors.primary,
    fontSize: 14,
    fontFamily:fonts.notosansBold,
    marginLeft: width
    
  },
});

export default App;
