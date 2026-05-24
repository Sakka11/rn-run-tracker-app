import Ionicons from "@expo/vector-icons/Ionicons";

import { router, useLocalSearchParams } from "expo-router";

import React from "react";

import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../services/supabase";

export default function RunDetail() {
  // รับข้อมูลที่ส่งมาจากหน้า run
  const params = useLocalSearchParams();

  const id = params.id as string;
  const image_url = params.image_url as string;

  // State สำหรับแก้ไขข้อมูล
  const [location, setLocation] = React.useState(
    (params.location as string) || "",
  );
  const [distance, setDistance] = React.useState(
    (params.distance as string) || "",
  );
  const [timeOfDay, setTimeOfDay] = React.useState(
    (params.time_of_day as string) || "เช้า",
  );

  // บันทึกการแก้ไข - UPDATE ลง Supabase
  const handleUpdate = async () => {
    if (!location || !distance) {
      Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอกสถานที่และระยะทาง");

      return;
    }

    const distanceNumber = parseFloat(distance);

    if (isNaN(distanceNumber)) {
      Alert.alert("ข้อมูลไม่ถูกต้อง", "กรุณากรอกระยะทางเป็นตัวเลข");

      return;
    }

    const { data, error } = await supabase
      .from("runs")
      .update({
        location: location,
        distance: distanceNumber,
        time_of_day: timeOfDay,
      })
      .eq("id", id)
      .select();

    if (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);

      return;
    }

    // Alert การแก้ไขสำเร็จ หรือ ไม่สำเร็จ
    if (!data || data.length === 0) {
      Alert.alert(
        "บันทึกไม่สำเร็จ",
        "ไม่สามารถแก้ไขข้อมูลในฐานข้อมูลได้ กรุณาตรวจสอบสิทธิ์ (RLS Policy) ของตาราง runs ใน Supabase",
      );

      return;
    }

    Alert.alert("สำเร็จ", "บันทึกการแก้ไขเรียบร้อยแล้ว", [
      {
        text: "ตกลง",
        onPress: () => router.back(),
      },
    ]);
  };

  // ลบรายการนี้ - DELETE จาก Supabase
  const handleDelete = () => {
    Alert.alert("ยืนยันการลบ", "ต้องการลบรายการวิ่งนี้ใช่หรือไม่?", [
      {
        text: "ยกเลิก",
        style: "cancel",
      },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          const { data, error } = await supabase
            .from("runs")
            .delete()
            .eq("id", id)
            .select();

          if (error) {
            Alert.alert("เกิดข้อผิดพลาด", error.message);

            return;
          }

          // ไม่มีแถวถูกลบ - ส่วนใหญ่คือ RLS/Policy ปิดสิทธิ์ DELETE อยู่
          if (!data || data.length === 0) {
            Alert.alert(
              "ลบไม่สำเร็จ",
              "ไม่สามารถลบข้อมูลในฐานข้อมูลได้ กรุณาตรวจสอบสิทธิ์ (RLS Policy) ของตาราง runs ใน Supabase",
            );

            return;
          }

          // ลบไฟล์รูปใน Storage ด้วย (ดึงชื่อไฟล์จากท้าย public URL)
          const fileName = image_url?.split("?")[0].split("/").pop();

          if (fileName) {
            await supabase.storage.from("run_bk").remove([fileName]);
          }

          Alert.alert("สำเร็จ", "ลบรายการเรียบร้อยแล้ว", [
            {
              text: "ตกลง",
              onPress: () => router.back(),
            },
          ]);
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#1f6fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* รูปภาพปกด้านบน */}
        <Image source={{ uri: image_url }} style={styles.coverImage} />

        {/* กล่องใส่ข้อมูล */}
        <View style={styles.detailBoxsheet}>
          {/* สถานที่ */}
          <Text style={styles.titleShow}>สถานที่</Text>

          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="เช่น สวนลุมพินี"
            placeholderTextColor="#9aa3b5"
          />

          {/* ระยะทาง */}
          <Text style={styles.titleShow}>ระยะทาง (กม.)</Text>

          <TextInput
            style={styles.input}
            value={distance}
            onChangeText={setDistance}
            keyboardType="numeric"
            placeholder="เช่น 5.2"
            placeholderTextColor="#9aa3b5"
          />

          {/* ช่วงเวลา */}
          <Text style={styles.titleShow}>ช่วงเวลา</Text>

          <View style={styles.todRow}>
            <TouchableOpacity
              style={[
                styles.todBtn,
                {
                  backgroundColor: timeOfDay === "เช้า" ? "#1f6fff" : "#e9ecf3",
                },
              ]}
              onPress={() => setTimeOfDay("เช้า")}
            >
              <Text
                style={{
                  fontFamily: "Kanit_400Regular",
                  color: timeOfDay === "เช้า" ? "#fff" : "#5a6478",
                }}
              >
                เช้า
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.todBtn,
                {
                  backgroundColor: timeOfDay === "เย็น" ? "#1f6fff" : "#e9ecf3",
                },
              ]}
              onPress={() => setTimeOfDay("เย็น")}
            >
              <Text
                style={{
                  fontFamily: "Kanit_400Regular",
                  color: timeOfDay === "เย็น" ? "#fff" : "#5a6478",
                }}
              >
                เย็น
              </Text>
            </TouchableOpacity>
          </View>

          {/* ปุ่มบันทึกการแก้ไข */}
          <TouchableOpacity
            style={styles.saveBtn}
            activeOpacity={0.85}
            onPress={handleUpdate}
          >
            <Text style={styles.saveBtnText}>บันทึกการแก้ไข</Text>
          </TouchableOpacity>

          {/* ปุ่มลบรายการ */}
          <TouchableOpacity
            style={styles.deleteBtn}
            activeOpacity={0.7}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#e8453c" />

            <Text style={styles.deleteBtnText}>ลบรายการนี้</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  coverImage: {
    width: "100%",
    height: 280,
    backgroundColor: "#eef1f7",
  },

  detailBoxsheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 24,
    paddingTop: 28,
  },

  titleShow: {
    fontFamily: "Kanit_700Bold",
    fontSize: 16,
    color: "#1c2540",
    marginTop: 18,
  },

  input: {
    fontFamily: "Kanit_400Regular",
    fontSize: 20,
    color: "#1f6fff",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e3e7ef",
  },

  todRow: {
    flexDirection: "row",
    marginTop: 14,
  },

  todBtn: {
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 999,
    marginRight: 12,
  },

  saveBtn: {
    marginTop: 32,
    height: 56,
    backgroundColor: "#1f6fff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#1f6fff",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,

    elevation: 5,
  },

  saveBtnText: {
    fontFamily: "Kanit_700Bold",
    fontSize: 18,
    color: "#fff",
  },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    paddingVertical: 8,
  },

  deleteBtnText: {
    fontFamily: "Kanit_700Bold",
    fontSize: 16,
    color: "#e8453c",
    marginLeft: 8,
  },
});
