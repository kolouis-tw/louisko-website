export const ZIWEI_BASELINE_GGDVB = {
  code: "GGDVB",
  source: "文墨天機專業版",
  presetStyle: "sanhe",
  language: {
    traditionalChinese: true
  },
  placement: {
    tianma: "year-branch",
    tiankong: "regular",
    brightness: "zhongzhou",
    jiekongXunkong: "paired-dual-star",
    tianshiTianshang: "zhongzhou",
    kuiyue: "liuxin-hu-ma",
    mingzhu: "zhongzhou",
    annualTransform: "annual-stem",
    changsheng: {
      distinguishYinYangDirection: true,
      waterEarthSharedBirth: true,
      fireEarthSharedBirth: false
    }
  },
  display: {
    feixing: {
      showShensha: true,
      showMinorStars: false,
      showShenGong: false,
      showLaiyinGong: true,
      showMingGongTransforms: true,
      showCenterFixedChartButton: false,
      showCenterBaziAndDayun: false,
      showColoredSelfTransformArrows: true,
      showCenterSanfangSizhengGuide: true
    },
    sanhe: {
      panelLayout: "flat",
      compactPanelLayout: false,
      showAnnualAgeInPalaces: true,
      showMinorAgeInPalaces: true,
      showAnnualOverlay: true,
      showMinorOverlay: true,
      showCenterSanfangSizhengGuide: true,
      showNonSolarTermFourPillars: true,
      showTaijiSwitchLabel: true,
      showSelfTransformArrowIcons: true,
      showColoredMultiArrows: true,
      showBoldMultiArrows: false,
      showHuagaiJieshaXianchi: true,
      showTiandeYuedeLongde: true,
      flowBoShi12: false,
      flowSuiJian12: true,
      flowJiangQian12: true,
      useBlackLabelsForSixSha: true,
      boldMainAndAssistantStarText: false,
      showYunyaoAndLiuyao: true,
      showFlowTianma: true,
      showFlowHuoling: false,
      showFlowHongluanTianxi: true,
      showFlowWenchangWenqu: true,
      showYunyaoAndLiuyaoInCompactMode: false
    },
    sihua: {
      showShensha: true,
      showDayStemTransforms: false,
      showSantaiBazuoEnguangTiangui: false,
      useColoredTransformLabels: false,
      showAnnualAge: true,
      showCenterBaziAndDayun: false,
      showCenterFixedChartButton: false
    }
  },
  transformTable: {
    jia: "廉破武陽",
    wu: "貪陰右機",
    geng: "陽武陰同",
    xin: "巨陽曲昌",
    ren: "梁紫輔武",
    gui: "破巨陰貪"
  },
  calendarHandling: {
    leapMonth: "midpoint",
    lateZiHour: {
      ziweiDayBoundary: "same-day",
      baziDayBoundary: "same-day",
      baziHourBoundary: "same-day"
    }
  },
  coverage: {
    screenshotDerived: true,
    hasKnownGaps: true
  }
} as const;
