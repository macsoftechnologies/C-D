import React from "react";
import { View, Image, Text, StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      {/* <Image
        source={require("./scroll_splash/assets/images/dairy.png")}
        style={styles.image}
        resizeMode="cover"
      /> */}

      <Text style={styles.rao}>Welcome to Canaan Dairy</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  image: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },

  rao: {
    marginTop: 20,
    fontSize: 20,
    color: "#1A3C8B",
    fontWeight: "600",
    textAlign: "center",
  },
});