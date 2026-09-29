
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { router } from "expo-router";

const { width, height } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    image: require("../../src/splash_screens/assets/images/cow.jpg"),
    title: "Welcome to Canaan Dairy",
    desc: "Track your daily milk collection, morning and evening, in one place",
  },
  {
    id: "2",
    image: require("../../src/splash_screens/assets/images/milk.jpg"),
    title: "Instant Milk Slips",
    desc: "Get fat, SNF, rate and amount for every collection instantly",
  },
  {
    id: "3",
    image: require("../../src/splash_screens/assets/images/farmer.jpg"),
    title: "A Symbol of Purity",
    desc: "Transparent bills and reports, right on your phone",
  },
];

export default function Onboarding() {
  const flatListRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const handleScroll = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const newIndex = Math.round(
      e.nativeEvent.contentOffset.x / width
    );

    setIndex(newIndex);
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={styles.slide}>

            {/* Brand */}
            <Text style={styles.brand}>
              Canaan Dairy
            </Text>

            {/* Center Image */}
            <View style={styles.imageContainer}>
              <Image
                source={item.image}
                style={styles.image}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {item.title}
            </Text>

            {/* Description */}
            <Text style={styles.desc}>
              {item.desc}
            </Text>

          </View>
        )}
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              index === i && styles.activeDot,
            ]}
          />
        ))}
      </View>

      {/* Skip Button */}
      <TouchableOpacity
        style={styles.skipButton}
        activeOpacity={0.8}
        onPress={() =>
          router.push("/registration/login")
        }
      >
        <Text style={styles.skipText}>
          Skip
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  slide: {
    width,
    flex: 1,
    alignItems: "center",
    paddingTop: 70,
    paddingHorizontal: 24,
  },

  /* Brand */
  brand: {
    fontSize: 24,
    color: "#1F5E4A",
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 35,
  },

  /* Image Wrapper */
  imageContainer: {
    width: width * 0.82,
    height: height * 0.38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },

  /* Image */
  image: {
    width: "100%",
    height: "100%",
  },

  /* Title */
  title: {
    fontSize: 23,
    fontWeight: "800",
    color: "#16302A",
    textAlign: "center",
    marginTop: 5,
  },

  /* Description */
  desc: {
    width: width * 0.78,
    textAlign: "center",
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: "#6B6B6B",
  },

  /* Pagination */
  pagination: {
    position: "absolute",
    bottom: 75,
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
  },

  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#D0D0D0",
    marginHorizontal: 5,
  },

  activeDot: {
    width: 24,
    backgroundColor: "#1F5E4A",
  },

  /* Skip Button */
  skipButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    backgroundColor: "#1F5E4A",
    paddingVertical: 10,
    paddingHorizontal: 26,
    borderRadius: 22,
  },

  skipText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

