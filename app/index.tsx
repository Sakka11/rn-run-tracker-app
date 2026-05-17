import React, { useEffect } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import { router } from "expo-router";

export default function Index() {
  // หน่วงเวลาหน้าจอ 3 วินาที แล้วเปิดไป /run แบบย้อนกลับไม่ได้

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/run");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  //------------------------------------------------

  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/images/runlogo.png")}
        style={styles.runlogo}
      />

      <Text style={styles.runtitle1}>Run Tracker</Text>

      <Text style={styles.runtitle2}>วิ่งเพื่อสุขภาพ</Text>

      <ActivityIndicator
        size="large"
        color="#1136ec"
        style={{ marginTop: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  runtitle2: {
    fontSize: 20,
    fontFamily: "Kanit_400Regular",
    color: "#a3a2a2",
  },

  runtitle1: {
    fontSize: 30,
    fontFamily: "Kanit_700Bold",
    color: "#0000ff",
  },

  runlogo: {
    width: 200,
    height: 200,
  },

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
