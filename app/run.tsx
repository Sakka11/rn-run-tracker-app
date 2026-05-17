import React from "react";

import AntDesign from "@expo/vector-icons/AntDesign";
import Ionicons from "@expo/vector-icons/Ionicons";

import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";

import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../services/supabase";
import { Runs } from "../types";

export default function Run() {
  // State เก็บรายการวิ่งทั้งหมด
  const [runs, setRuns] = React.useState<Runs[]>([]);

  // State สถานะกำลังโหลด
  const [loading, setLoading] = React.useState(true);

  // State pull-to-refresh
  const [refreshing, setRefreshing] = React.useState(false);

  // อนิเมชันคลื่นเรดาร์รอบปุ่ม + (2 วงเหลื่อมเวลากันครึ่งรอบ ให้ต่อเนื่องลื่น)
  const wave1 = React.useRef(new Animated.Value(0)).current;
  const wave2 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const DURATION = 2400;

    const makeLoop = (value: Animated.Value) =>
      Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration: DURATION,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );

    const loop1 = makeLoop(wave1);
    const loop2 = makeLoop(wave2);

    loop1.start();

    // วงที่ 2 เริ่มช้ากว่าครึ่งรอบ → คลื่นไหลต่อเนื่องไม่ขาดช่วง
    const timer = setTimeout(() => loop2.start(), DURATION / 2);

    return () => {
      loop1.stop();
      loop2.stop();
      clearTimeout(timer);
    };
  }, [wave1, wave2]);

  // แปลงค่าเป็น scale + opacity (จางเข้าเร็ว แล้วค่อยจางออก = ไม่มีป๊อป)
  const ringScale = (value: Animated.Value) =>
    value.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.6],
    });

  const ringOpacity = (value: Animated.Value) =>
    value.interpolate({
      inputRange: [0, 0.1, 1],
      outputRange: [0, 0.45, 0],
    });

  // ดึงข้อมูลทั้งหมดจาก Supabase
  const fetchRuns = React.useCallback(async () => {
    const { data, error } = await supabase
      .from("runs")
      .select("*")
      .order("run_date", { ascending: false })
      .order("id", { ascending: false });

    if (!error && data) {
      setRuns(data as Runs[]);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  // ดึงข้อมูลใหม่ทุกครั้งที่เข้ามาหน้านี้ (รวมตอนเปิดครั้งแรก และตอนกดบันทึกที่หน้า add แล้ว router.back() กลับมา)
  // ทำให้รายการอัปเดต Realtime (useFocusEffect) + Supabase Realtime เพื่อให้มันขึ้นอัตโนมัติโดยที่ อีกเครื่องไม่ต้อง รีเฟรชจอ
  useFocusEffect(
    React.useCallback(() => {
      fetchRuns();
    }, [fetchRuns]),
  );

  React.useEffect(() => {
    const channel = supabase
      .channel("runs-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "runs" },
        (payload) => {
          // เพิ่มข้อมูลใหม่ขึ้นบนสุด (กันซ้ำด้วย id เผื่อ useFocusEffect ดึงมาแล้ว)
          setRuns((prev) => {
            const incoming = payload.new as Runs;

            if (prev.some((r) => r.id === incoming.id)) {
              return prev;
            }

            return [incoming, ...prev];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "runs" },
        (payload) => {
          // อัปเดตแถวที่ถูกแก้ไข
          const updated = payload.new as Runs;

          setRuns((prev) =>
            prev.map((r) => (r.id === updated.id ? updated : r)),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "runs" },
        (payload) => {
          // เอาแถวที่ถูกลบออก
          const removed = payload.old as Runs;

          setRuns((prev) => prev.filter((r) => r.id !== removed.id));
        },
      )
      .subscribe();

    // ยกเลิกการ subscribe เมื่อออกจากหน้าจอ
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // แปลงวันที่ (YYYY-MM-DD) เป็นรูปแบบไทย "
  const formatThaiDate = (dateStr: string) => {
    const thaiMonths = [
      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม",
    ];

    const [year, month, day] = dateStr.split("-").map(Number);

    if (!year || !month || !day) {
      return dateStr;
    }

    return `${day} ${thaiMonths[month - 1]} พ.ศ. ${year + 543}`;
  };

  // กดเพื่อไปหน้ารายละเอียด
  const openDetail = (item: Runs) => {
    router.push({
      pathname: "/[id]",
      params: {
        id: item.id,
        location: item.location,
        distance: String(item.distance),
        time_of_day: item.time_of_day,
        run_date: item.run_date,
        image_url: item.image_url,
      },
    });
  };

  // สรุปสถิติ
  const totalRuns = runs.length;
  // ปิดการใช้งานชั่วคราว: ระยะทางรวม ** เดี๋ยวค่อยเปิด เดี๋ยวไม่เหมือนตาม Mockup รอใส่ตอนเสร็จทีเดียว เพื่อความสวยงาม 55555 **
  // const totalDistance = runs.reduce(
  //   (sum, item) => sum + (Number(item.distance) || 0),
  //   0,
  // );

  // ส่วนหัว: โลโก้ + สรุปสถิติ
  const ListHeader = (
    <View>
      <Image
        source={require("@/assets/images/runlogo.png")}
        style={styles.runlogo}
      />

      {/* ----- ปิดการใช้งานชั่วคราว ** : สรุปสถิติ (ครั้งที่วิ่ง / ระยะทางรวม)  -----
      <LinearGradient
        colors={["#3a7bff", "#6c4cff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statCard}
      >
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Ionicons name="footsteps" size={20} color="#fff" />
          </View>

          <Text style={styles.statValue}>{totalRuns}</Text>

          <Text style={styles.statLabel}>ครั้งที่วิ่ง</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Ionicons name="map" size={20} color="#fff" />
          </View>

          <Text style={styles.statValue}>{totalDistance.toFixed(1)}</Text>

          <Text style={styles.statLabel}>ระยะทางรวม (กม.)</Text>
        </View>
      </LinearGradient>
      ----- จบส่วนที่ปิดการใช้งาน ----- */}

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>สถานที่ไปวิ่ง</Text>

        <View style={styles.countChip}>
          <Text style={styles.countChipText}>{totalRuns} รายการ</Text>
        </View>
      </View>
    </View>
  );

  // ส่วนแต่ละรายการ
  const renderItem = ({ item }: { item: Runs }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => openDetail(item)}
    >
      <Image source={{ uri: item.image_url }} style={styles.cardImage} />

      <View style={styles.cardBody}>
        <Text style={styles.cardLocation} numberOfLines={1}>
          {item.location}
        </Text>

        <View style={styles.cardDateRow}>
          <Ionicons name="calendar-outline" size={14} color="#9a9a9a" />

          <Text style={styles.cardDate}>{formatThaiDate(item.run_date)}</Text>
        </View>

        <View style={styles.distancePill}>
          <Text style={styles.distancePillText}>{item.distance} km</Text>
        </View>
      </View>

      <View style={styles.chevronCircle}>
        <AntDesign name="right" size={16} color="#1f6fff" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#1f6fff" />
          <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
        </View>
      ) : (
        <FlatList
          data={runs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor="#1f6fff"
              colors={["#1f6fff"]}
              onRefresh={() => {
                setRefreshing(true);
                fetchRuns();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="walk-outline" size={56} color="#c4cede" />

              <Text style={styles.emptyTitle}>ยังไม่มีข้อมูลการวิ่ง</Text>

              <Text style={styles.emptyText}>
                กดปุ่ม + ด้านล่างเพื่อเพิ่มรายการแรกของคุณ
              </Text>
            </View>
          }
        />
      )}

      {/* ปุ่มเปิดไปหน้าจอ /add (มีคลื่นกระเพื่อม เรด้าแบบสวยๆ แอคๆ) */}
      <View style={styles.fabWrap} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.fabWave,
            {
              transform: [{ scale: ringScale(wave1) }],
              opacity: ringOpacity(wave1),
            },
          ]}
        />

        <Animated.View
          style={[
            styles.fabWave,
            {
              transform: [{ scale: ringScale(wave2) }],
              opacity: ringOpacity(wave2),
            },
          ]}
        />

        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.85}
          onPress={() => router.push("/add")}
        >
          <LinearGradient
            colors={["#3a7bff", "#6c4cff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addBtnGradient}
          >
            <AntDesign name="plus" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f5fb",
  },

  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    fontFamily: "Kanit_400Regular",
    color: "#8a93a6",
    marginTop: 12,
  },

  runlogo: {
    width: 110,
    height: 110,
    alignSelf: "center",
    marginTop: 20,
    marginBottom: 6,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 130,
  },

  // สรุปสถิติ
  statCard: {
    flexDirection: "row",
    borderRadius: 24,
    paddingVertical: 22,
    marginTop: 8,
    marginBottom: 24,

    shadowColor: "#6c4cff",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.35,
    shadowRadius: 18,

    elevation: 8,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },

  statValue: {
    fontFamily: "Kanit_700Bold",
    fontSize: 24,
    color: "#fff",
  },

  statLabel: {
    fontFamily: "Kanit_400Regular",
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
  },

  statDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
    marginVertical: 6,
  },

  // ส่วนหัวรายการ
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  sectionTitle: {
    fontFamily: "Kanit_700Bold",
    fontSize: 18,
    color: "#1c2540",
  },

  countChip: {
    backgroundColor: "#e8f1ff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },

  countChipText: {
    fontFamily: "Kanit_400Regular",
    fontSize: 12,
    color: "#1f6fff",
  },

  // ส่วนรายการ
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 22,
    marginBottom: 16,
    padding: 14,

    shadowColor: "#1f3a8a",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,

    elevation: 4,
  },

  cardImage: {
    width: 92,
    height: 92,
    borderRadius: 16,
    backgroundColor: "#eef1f7",
  },

  cardBody: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },

  cardLocation: {
    fontFamily: "Kanit_700Bold",
    fontSize: 19,
    color: "#1c2540",
  },

  cardDateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },

  cardDate: {
    fontFamily: "Kanit_400Regular",
    fontSize: 14,
    color: "#9a9a9a",
    marginLeft: 5,
  },

  distancePill: {
    alignSelf: "flex-start",
    backgroundColor: "#e8f1ff",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 10,
  },

  distancePillText: {
    fontFamily: "Kanit_700Bold",
    fontSize: 14,
    color: "#1f6fff",
  },

  chevronCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f3f5fb",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  // สถานะว่าง
  emptyBox: {
    alignItems: "center",
    marginTop: 50,
    paddingHorizontal: 30,
  },

  emptyTitle: {
    fontFamily: "Kanit_700Bold",
    fontSize: 17,
    color: "#5a6478",
    marginTop: 14,
  },

  emptyText: {
    fontFamily: "Kanit_400Regular",
    fontSize: 14,
    textAlign: "center",
    color: "#9aa3b5",
    marginTop: 4,
  },

  // ปุ่มเพิ่ม (+) พร้อมคลื่นเรดาร์ เก๋ๆ
  fabWrap: {
    position: "absolute",
    bottom: 60,
    right: 28,
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },

  fabWave: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#6c4cff",
  },

  addBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,

    shadowColor: "#6c4cff",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.45,
    shadowRadius: 12,

    elevation: 8,
  },

  addBtnGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
});
