import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useRouter } from "expo-router";

import React from "react";

import {
  ActivityIndicator,
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

import { decode } from "base64-arraybuffer";

import { supabase } from "../services/supabase";

export default function Addtmp() {
  const router = useRouter();

  // State จัดการข้อมูล
  const [location, setLocation] = React.useState("");
  const [distance, setDistance] = React.useState("");
  const [timeOfDay, setTimeOfDay] = React.useState("เช้า");

  // State รูปภาพ
  const [imageUri, setImageUri] = React.useState<string | null>(null);

  const [base64Image, setBase64Image] = React.useState<string | null>(null);

  // State สถานะกำลังบันทึก
  const [saving, setSaving] = React.useState(false);

  // ฟังก์ชันเปิดกล้อง
  const takePhoto = async () => {
    // Alert ก่อน ((ทุกครั้ง)) เพื่อขอสิทธิ์ *กัน PDPA
    Alert.alert("แจ้งเตือน", "แอปต้องการเปิดกล้องเพื่อถ่ายภาพ", [
      {
        text: "ยกเลิก",
        style: "cancel",
      },

      {
        text: "ตกลง",

        onPress: async () => {
          // ขอ permission
          const { status } = await ImagePicker.requestCameraPermissionsAsync();

          // ถ้าไม่อนุญาต
          if (status !== "granted") {
            Alert.alert(
              "ไม่สามารถใช้งานกล้องได้",
              "กรุณาอนุญาตการเข้าถึงกล้อง",
            );

            return;
          }

          // เปิดกล้อง
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.5,
            base64: true,
          });

          // ถ่ายสำเร็จ
          if (!result.canceled) {
            setImageUri(result.assets[0].uri);

            setBase64Image(result.assets[0].base64 || null);
          }
        },
      },
    ]);
  };

  // ฟังก์ชันเลือกรูปจากอัลบั้ม ** อยากทำเพิ่ม เผื่อมีรูปสวย 5555
  const pickImage = async () => {
    // ขอ permission เข้าถึงคลังรูป
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    // ถ้าไม่อนุญาต
    if (status !== "granted") {
      Alert.alert(
        "ไม่สามารถเข้าถึงอัลบั้มได้",
        "กรุณาอนุญาตการเข้าถึงคลังรูปภาพ",
      );

      return;
    }

    // เปิดอัลบั้ม
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.5,
      base64: true,
    });

    // เลือกสำเร็จ
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);

      setBase64Image(result.assets[0].base64 || null);
    }
  };

  // Upload และ Save Data
  const uploadAndSaveData = async () => {
    // Validate
    if (!location || !distance || !base64Image) {
      Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอกข้อมูลและถ่ายรูป");

      return;
    }

    setSaving(true);

    try {
      // สร้างชื่อไฟล์ไม่ซ้ำ
      const fileName = `run_${Date.now()}.jpg`;

      // แปลง Base64 → BinaryData
      const binaryData = decode(base64Image);

      // Upload ไป Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("run_bk")
        .upload(fileName, binaryData, {
          contentType: "image/jpeg",
        });

      // ถ้า upload error
      if (uploadError) {
        Alert.alert("Upload Error", uploadError.message);

        return;
      }

      // ดึง Public URL
      const image_url = supabase.storage.from("run_bk").getPublicUrl(fileName)
        .data.publicUrl;

      // Insert Database
      const { error: insertError } = await supabase.from("runs").insert({
        location: location,

        distance: parseFloat(distance),

        time_of_day: timeOfDay,

        run_date: new Date().toISOString().split("T")[0],

        image_url: image_url,
      });

      // ถ้า insert error
      if (insertError) {
        Alert.alert("Database Error", insertError.message);

        return;
      }

      // สำเร็จ
      Alert.alert("สำเร็จ", "บันทึกข้อมูลเรียบร้อยแล้ว", [
        {
          text: "ตกลง",

          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* สถานที่ */}
        <Text style={styles.titleShow}>สถานที่วิ่ง</Text>

        <TextInput
          placeholder="เช่น สวนลุมพินี"
          placeholderTextColor="#666"
          style={styles.inputValue}
          value={location}
          onChangeText={setLocation}
        />

        {/* ระยะทาง */}
        <Text style={styles.titleShow}>ระยะทาง (กิโลเมตร)</Text>

        <TextInput
          placeholder="เช่น 5.2"
          placeholderTextColor="#666"
          keyboardType="numeric"
          style={styles.inputValue}
          value={distance}
          onChangeText={setDistance}
        />

        {/* ช่วงเวลา */}
        <Text style={styles.titleShow}>ช่วงเวลา</Text>

        <View
          style={{
            flexDirection: "row",
            marginBottom: 20,
          }}
        >
          {/* เช้า */}
          <TouchableOpacity
            style={[
              styles.todBtn,
              {
                backgroundColor: timeOfDay === "เช้า" ? "#1889da" : "#e6e6e6",
              },
            ]}
            onPress={() => setTimeOfDay("เช้า")}
          >
            <Text
              style={{
                fontFamily: "Kanit_400Regular",

                color: timeOfDay === "เช้า" ? "#fff" : "#4d4d4d",
              }}
            >
              เช้า
            </Text>
          </TouchableOpacity>

          {/* เย็น */}
          <TouchableOpacity
            style={[
              styles.todBtn,
              {
                backgroundColor: timeOfDay === "เย็น" ? "#1889da" : "#e6e6e6",
              },
            ]}
            onPress={() => setTimeOfDay("เย็น")}
          >
            <Text
              style={{
                fontFamily: "Kanit_400Regular",

                color: timeOfDay === "เย็น" ? "#fff" : "#4d4d4d",
              }}
            >
              เย็น
            </Text>
          </TouchableOpacity>
        </View>

        {/* รูปภาพ */}
        <Text style={styles.titleShow}>รูปภาพสถานที่</Text>

        <TouchableOpacity style={styles.takePhotoBtn} onPress={takePhoto}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View
              style={{
                alignItems: "center",
              }}
            >
              <Ionicons name="camera-outline" size={30} color="#b6b6b6" />

              <Text
                style={{
                  fontFamily: "Kanit_400Regular",

                  color: "#b6b6b6",
                }}
              >
                กดเพื่อถ่ายภาพ
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ปุ่มเลือกรูปจากอัลบั้ม */}
        <TouchableOpacity
          style={styles.pickImageBtn}
          onPress={pickImage}
          activeOpacity={0.8}
        >
          <Ionicons name="images-outline" size={20} color="#1889da" />

          <Text style={styles.pickImageBtnText}>เลือกจากอัลบั้ม</Text>
        </TouchableOpacity>

        {/* ปุ่มบันทึก */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={uploadAndSaveData}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <View style={styles.savingRow}>
              <ActivityIndicator color="#fff" />

              <Text style={styles.saveBtnText}>กำลังบันทึก...</Text>
            </View>
          ) : (
            <Text style={styles.saveBtnText}>บันทึกข้อมูล</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  todBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
  },

  saveBtn: {
    padding: 15,
    backgroundColor: "#1889da",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },

  saveBtnDisabled: {
    backgroundColor: "#8fbfe6",
  },

  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  saveBtnText: {
    fontFamily: "Kanit_700Bold",
    color: "#fff",
  },

  pickImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1889da",
  },

  pickImageBtnText: {
    fontFamily: "Kanit_700Bold",
    color: "#1889da",
  },

  takePhotoBtn: {
    width: "100%",
    height: 200,
    backgroundColor: "#e6e6e6",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  inputValue: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    fontFamily: "Kanit_400Regular",
    backgroundColor: "#EFEFEF",
    color: "#000",
  },

  titleShow: {
    fontFamily: "Kanit_700Bold",
    marginBottom: 10,
  },
});
