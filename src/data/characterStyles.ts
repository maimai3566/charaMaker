export type CharacterStyleCategory = {
  id: string;
  name: string;
  styles: CharacterStyle[];
  allowMultiple: boolean; // trueの場合はそのカテゴリー内で複数選択可、false(排他)も設定可能
};

export type CharacterStyle = {
  label: string;
  value: string;
  detail?: string; // プロンプトの詳細説明（UI表示用）
};

export const CHARACTER_STYLE_CATEGORIES: CharacterStyleCategory[] = [
  {
    id: "basic",
    name: "基本スタイル",
    allowMultiple: false, 
    styles: [
      { label: "カートゥーン風", value: "Cartoon style, cell shaded, high contrast" },
      { label: "ドット絵風", value: "Pixel art style, 16-bit retro aesthetic" },
      { label: "フラットデザイン", value: "Flat vector art, minimal details, solid colors" },
      { label: "手書きスケッチ風", value: "Hand-drawn pencil sketch, rough lines, storybook style" },
      { label: "水彩画風", value: "Watercolor illustration, soft pastel colors" },
    ]
  },
  {
    id: "texture",
    name: "質感・マテリアル",
    allowMultiple: true,
    styles: [
      { label: "3DCG", value: "3D render, highly detailed, octane render" },
      { label: "ローポリ", value: "low poly 3d art, flat shading" },
      { label: "ボクセルアート", value: "voxel art, 3d pixel blocks" },
      { label: "クレイアニメ風", value: "claymation style, soft lighting, clay texture" },
      { label: "ガラス質感", value: "glass material, translucent, reflective, shiny" },
      { label: "金属質感", value: "metallic material, shiny surface, specular highlights" },
      { label: "ぬいぐるみ風", value: "plush toy style, soft fabric texture, stitching" },
      { label: "羊毛フェルト風", value: "needle-felted style, fuzzy wool texture, cute" },
    ]
  },
  {
    id: "worldview",
    name: "頭身・ディフォルメ",
    allowMultiple: false,
    styles: [
      { label: "SDキャラ (ちび)", value: "super-deformed, chibi style, incredibly cute, big eyes" },
      { label: "2頭身", value: "2-head-tall character layout" },
      { label: "3頭身", value: "3-head-tall character layout" },
      { label: "ダークファンタジー", value: "Dark fantasy style, grim, moody lighting, monster-like" },
    ]
  },
  {
    id: "outline",
    name: "線の太さ",
    allowMultiple: false,
    styles: [
      { label: "太線 (推奨)", value: "clear THICK black outer lines on the character only, High contrast contour" },
      { label: "細線", value: "thin precise lines, clean delicate lineart" },
      { label: "線なし", value: "lineless art style" },
    ]
  }
];
