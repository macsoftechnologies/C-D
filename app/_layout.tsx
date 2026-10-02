// import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
// import { Stack } from 'expo-router';
// import { StatusBar } from 'expo-status-bar';
// import 'react-native-reanimated';

// import { useColorScheme } from '@/hooks/use-color-scheme';

// export const unstable_settings = {
//   anchor: '(tabs)',
// };

// export default function RootLayout() {
//   const colorScheme = useColorScheme();

//   return (
//     <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
//       <Stack>
//         <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
//         <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
//         <Stack.Screen name='onboardings/login' options={{headerShown : false}} />
//         <Stack.Screen name='onboardings/registration' options={{headerShown : false}} />
//         <Stack.Screen name='onboardings/referal' options={{headerShown : false}} />
//         <Stack.Screen name='onboardings/signin-other' options={{headerShown : false}} />
//         <Stack.Screen name='onboardings/mobile_verify' options={{headerShown : false}} />
//          <Stack.Screen name='onboardings/forgot_password'options={{headerShown:false}}/>
//        <Stack.Screen name='dashboard/dashboard' options={{headerShown:false}}/>
//         <Stack.Screen name='dashboard/notification' options={{headerShown:false}}/>
//         <Stack.Screen name='dashboard/search' options={{headerShown:false}}/>
//         <Stack.Screen name='explore/courses' options={{headerShown:false}}/>
//         <Stack.Screen name='explore/courseoverview'options={{headerShown:false}}/>
//         <Stack.Screen name='explore/coursepackage' options={{headerShown:false}}/>
//         <Stack.Screen name='paymentgateways/razorpay' options={{headerShown:false}}/>
//         <Stack.Screen name='exploreddj/course' options={{headerShown:false}}/>
//         <Stack.Screen name='subjectlist/details' options={{headerShown:false}}/>
//         <Stack.Screen name='subjectlist/subjectlist' options={{headerShown:false}}/>
//         <Stack.Screen name='paymentgateways/payment_sucess' options={{headerShown:false}}/>
//         <Stack.Screen name='paymentgateways/payment_failure' options={{headerShown:false}}/>
//         <Stack.Screen name='combos/civil' options={{headerShown:false}}/>
//         <Stack.Screen name='combos/explore_civil' options={{headerShown:false}}/>
//          <Stack.Screen name='combos/civilsub' options={{headerShown:false}}/>
//           <Stack.Screen name='combos/combolec' options={{headerShown:false}}/>
//           <Stack.Screen name='combos/buy' options={{headerShown:false}}/>
//            <Stack.Screen name='combos/criminal' options={{headerShown:false}}/>
//            <Stack.Screen name='notes/combo' options={{headerShown:false}}/>
//             <Stack.Screen name='notes/law' options={{headerShown:false}}/>
//              <Stack.Screen name='notes/civil_law' options={{headerShown:false}}/>
//              <Stack.Screen name='notes/civil_buy' options={{headerShown:false}}/>
//              <Stack.Screen name='notes_module/pdf_notes/Notes' options={{headerShown:false}}/>
//               <Stack.Screen name='notes_module/pdf_notes/notes_data' options={{headerShown:false}}/>
//               <Stack.Screen name='notes_module/pdf_notes/notes_package' options={{headerShown:false}}/>
//              <Stack.Screen name='notes_module/notes_way' options={{headerShown:false}}/>
//              <Stack.Screen name='notes_module/printed_notes/printed_List' options={{headerShown:false}}/>
//               <Stack.Screen name='notes_module/printed_notes/printed_package' options={{headerShown:false}}/>
//               <Stack.Screen name='prelims/preparation' options={{headerShown:false}}/>
//               <Stack.Screen name='prelims/prelims_preparation' options={{headerShown:false}}/>
//               <Stack.Screen name='prelims/button_prelims' options={{headerShown:false}}/>
//   <Stack.Screen name='subject_mock_test/mock_preparation' options={{headerShown:false}}/>
//   <Stack.Screen name='subject_mock_test/civil_mock' options={{headerShown:false}}/>
//   <Stack.Screen name='subject_mock_test/mock_test' options={{headerShown:false}}/>
//    <Stack.Screen name='subject_mock_test/mock_task' options={{headerShown:false}}/>
//     <Stack.Screen name='subject_mock_test/view_result' options={{headerShown:false}}/>
//          <Stack.Screen name='subject_mock_test/view.mock' options={{headerShown:false}}/>
//           <Stack.Screen name='subject_mock_test/start_mock' options={{headerShown:false}}/>
//           <Stack.Screen name='subject_mock_test/instructions' options={{headerShown:false}}/>
//           <Stack.Screen name='subject_mock_test/test_performance' options={{headerShown:false}}/>
//           <Stack.Screen name='grandmodule/grand_test' options={{headerShown:false}}/>
//            <Stack.Screen name='grandmodule/grand_instructions' options={{headerShown:false}}/>
//          <Stack.Screen name='grandmodule/grand_test_start' options={{headerShown:false}}/>
//          <Stack.Screen name='grandmodule/grand_test_results' options={{headerShown:false}}/>
//           <Stack.Screen name='sidepanel/profile/main_profile' options={{headerShown:false}}/>
//           <Stack.Screen name='sidepanel/profile/personal_info' options={{headerShown:false}}/>
//         <Stack.Screen name='sidepanel/profile/admin_submit' options={{headerShown:false}}/>
//          <Stack.Screen name='sidepanel/profile/admin_consulting' options={{headerShown:false}}/>
//            <Stack.Screen name='notes/notes_combo' options={{headerShown:false}}/>
//            <Stack.Screen name='sidepanel/profile/educational_info' options={{headerShown:false}}/>
//             <Stack.Screen name='sidepanel/profile/educational_submit' options={{headerShown:false}}/>
//               <Stack.Screen name='sidepanel/profile/educational_details' options={{headerShown:false}}/>
//               <Stack.Screen name='sidepanel/profile/id_proof' options={{headerShown:false}}/>
//                 <Stack.Screen name='sidepanel/profile/id_submit' options={{headerShown:false}}/>
//                  <Stack.Screen name='sidepanel/profile/id_details' options={{headerShown:false}}/>/'
//       </Stack>
//       <StatusBar style="auto" />
//     </ThemeProvider>
//   );
// }

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import '@/src/services/dairyApi';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: '#dff4f873',
          }}
          edges={['top', 'bottom']}
        >
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />

          <Toast />

          <StatusBar style="light" />
        </SafeAreaView>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

