# 要件定義書: レイヤーエディタシステム

## はじめに

MYNT MIDIの現在のシングルノートエディタを、複数レイヤーを重ねて編集・再生できるレイヤーベースのシステムに拡張する。各レイヤーは独立したMIDI文字列、オシレータタイプ、カラー、音量、ミュート/ソロ機能を持ち、ピアノロールエディタ上でカラーコード付きで重ね表示される。再生時は全レイヤーが同時に独立したオシレータチェーンで発音する。

## 用語集

- **Layer_Panel**: ヘッダーとMIDI文字列エリアの間に配置されるレイヤー管理UIパネル
- **Layer**: MIDI文字列・オシレータタイプ・カラー・音量・ミュート/ソロ状態を持つ独立した音楽データ単位
- **Active_Layer**: 現在編集対象として選択されているレイヤー。ピアノロールエディタで直接編集可能
- **Piano_Roll_Editor**: 既存のピアノロール風エディタ（`Editor`クラス）。全レイヤーのノートを重ね表示する
- **MIDI_String_Area**: 既存のtextareaエリア。アクティブレイヤーのMIDI文字列を表示・編集する
- **Layer_Model**: レイヤーデータを管理するデータモデル。各レイヤーのid、name、oscillatorType、color、midiString、volume、mute、solo状態を保持する
- **MidiPlayer**: Web Audio APIによる音声再生モジュール。レイヤーごとに独立したオシレータ＋ゲインチェーンを生成する
- **JsonConverter**: JSON形式とMIDI文字列の相互変換モジュール
- **Oscillator_Type**: Web Audio APIのオシレータ波形タイプ（sine, square, sawtooth, triangle）

## 要件

### 要件1: レイヤーデータモデル

**ユーザーストーリー:** 開発者として、複数レイヤーのデータを一元管理するモデルが欲しい。これにより、各レイヤーの状態を正確に保持し、UI・再生・シリアライズの各機能が同一のデータソースを参照できる。

#### 受け入れ基準

1. THE Layer_Model SHALL 各レイヤーに対してid（一意識別子）、name（表示名）、oscillatorType（オシレータタイプ）、color（表示色）、midiString（MIDI文字列）、volume（0〜100の整数）、mute（真偽値）、solo（真偽値）のプロパティを保持する
2. THE Layer_Model SHALL 初期状態として1つのデフォルトレイヤーを生成し、既存のtextareaのMIDI文字列とヘッダーのオシレータタイプ選択値をそのレイヤーに引き継ぐ
3. WHEN 新しいレイヤーが追加されるとき、THE Layer_Model SHALL 一意のidを生成し、デフォルト値（oscillatorType: "square"、volume: 50、mute: false、solo: false、空のmidiString）を設定する
4. WHEN レイヤーが削除されるとき、THE Layer_Model SHALL 該当レイヤーをモデルから除去する
5. IF レイヤーが1つしか存在しない状態で削除が要求された場合、THEN THE Layer_Model SHALL 削除を拒否し、レイヤーを1つ以上維持する
6. THE Layer_Model SHALL 各レイヤーに対して事前定義されたカラーパレットから色を自動割り当てする

### 要件2: レイヤーパネルUI

**ユーザーストーリー:** ユーザーとして、レイヤーの一覧を視覚的に確認し、各レイヤーの設定を直感的に操作したい。これにより、複数パートの管理が容易になる。

#### 受け入れ基準

1. THE Layer_Panel SHALL ヘッダーとMIDI文字列エリアの間に配置される
2. THE Layer_Panel SHALL 各レイヤーに対して、カラーインジケーター、レイヤー名、オシレータタイプ選択（sine/square/sawtooth/triangle）、ミュートボタン、ソロボタン、音量スライダー（0〜100）、削除ボタンを表示する
3. WHEN レイヤー行がクリックされたとき、THE Layer_Panel SHALL そのレイヤーをActive_Layerとして設定し、選択状態を視覚的にハイライト表示する
4. WHEN 「レイヤー追加」ボタンがクリックされたとき、THE Layer_Panel SHALL 新しいレイヤーをLayer_Modelに追加し、パネルに新しいレイヤー行を表示する
5. WHEN 削除ボタンがクリックされたとき、THE Layer_Panel SHALL 該当レイヤーをLayer_Modelから削除し、パネルから行を除去する
6. WHEN オシレータタイプが変更されたとき、THE Layer_Panel SHALL 該当レイヤーのoscillatorTypeをLayer_Modelに反映する
7. WHEN 音量スライダーが操作されたとき、THE Layer_Panel SHALL 該当レイヤーのvolumeをLayer_Modelに反映する
8. WHEN ミュートボタンがクリックされたとき、THE Layer_Panel SHALL 該当レイヤーのmute状態をトグルし、ボタンの視覚状態を更新する
9. WHEN ソロボタンがクリックされたとき、THE Layer_Panel SHALL 該当レイヤーのsolo状態をトグルし、ボタンの視覚状態を更新する

### 要件3: ヘッダーのオシレータタイプ選択の移行

**ユーザーストーリー:** ユーザーとして、オシレータタイプをレイヤーごとに設定したい。これにより、各レイヤーで異なる音色を使い分けられる。

#### 受け入れ基準

1. WHEN レイヤーシステムが初期化されたとき、THE Layer_Panel SHALL ヘッダーのグローバルオシレータタイプ選択の機能をレイヤーパネル内の各レイヤー行のオシレータタイプ選択に移行する
2. THE Piano_Roll_Editor SHALL ヘッダーのグローバルオシレータタイプ選択を非表示にする

### 要件4: アクティブレイヤーとMIDI文字列エリアの連動

**ユーザーストーリー:** ユーザーとして、アクティブレイヤーのMIDI文字列をtextareaで直接確認・編集したい。これにより、テキストベースの編集ワークフローが維持される。

#### 受け入れ基準

1. WHEN Active_Layerが切り替わったとき、THE MIDI_String_Area SHALL 新しいActive_LayerのmidiStringをtextareaに表示する
2. WHEN textareaの内容が変更されたとき、THE MIDI_String_Area SHALL 変更内容をActive_LayerのmidiStringとしてLayer_Modelに反映する
3. WHEN textareaの内容が変更されたとき、THE Piano_Roll_Editor SHALL Active_Layerのノート表示を更新する

### 要件5: ピアノロールエディタのカラーコード表示

**ユーザーストーリー:** ユーザーとして、各レイヤーのノートを色分けして表示したい。これにより、どのノートがどのレイヤーに属するか一目で判別できる。

#### 受け入れ基準

1. THE Piano_Roll_Editor SHALL Active_Layerのノートをそのレイヤーのcolorで不透明に表示する
2. THE Piano_Roll_Editor SHALL Active_Layer以外のレイヤーのノートをそのレイヤーのcolorで半透明（opacity 0.3）に表示する
3. WHEN Active_Layerが切り替わったとき、THE Piano_Roll_Editor SHALL 全レイヤーのノート表示の不透明度を更新する
4. THE Piano_Roll_Editor SHALL Active_Layerのノートのみクリック・ドラッグによる編集操作を受け付ける
5. THE Piano_Roll_Editor SHALL Active_Layer以外のレイヤーのノートに対するクリック・ドラッグ操作を無視する

### 要件6: レイヤー対応の再生

**ユーザーストーリー:** ユーザーとして、全レイヤーを同時に再生し、各レイヤーの音色と音量が独立して反映されるようにしたい。これにより、マルチパートの楽曲をプレビューできる。

#### 受け入れ基準

1. WHEN 再生ボタンがクリックされたとき、THE MidiPlayer SHALL ミュートされていない各レイヤーに対して独立したオシレータノード＋ゲインノードのチェーンを生成する
2. THE MidiPlayer SHALL 各レイヤーのオシレータチェーンに対して、そのレイヤーのoscillatorTypeを適用する
3. THE MidiPlayer SHALL 各レイヤーのゲインノードに対して、そのレイヤーのvolume値（0〜100を0.0〜1.0に変換）を適用する
4. WHILE いずれかのレイヤーにsolo状態が設定されている間、THE MidiPlayer SHALL solo状態のレイヤーのみ発音し、solo状態でないレイヤーを無音にする
5. WHILE いずれのレイヤーにもsolo状態が設定されていない間、THE MidiPlayer SHALL mute状態でない全レイヤーを発音する
6. WHEN 再生中にミュート/ソロ状態が変更されたとき、THE MidiPlayer SHALL 次回の再生開始時にその変更を反映する

### 要件7: JSON Import/Exportのレイヤー対応

**ユーザーストーリー:** ユーザーとして、レイヤー構成を含むプロジェクトデータをJSON形式で保存・読み込みしたい。これにより、作業の中断・再開や他者との共有が可能になる。

#### 受け入れ基準

1. WHEN JSONエクスポートが実行されたとき、THE JsonConverter SHALL 全レイヤーの情報（id、name、oscillatorType、color、midiString、volume、mute、solo）を含むJSON文字列を生成する
2. WHEN レイヤー形式のJSONがインポートされたとき、THE JsonConverter SHALL layers配列からレイヤーデータを復元し、Layer_Modelに反映する
3. WHEN レイヤー形式でない旧形式のJSON（bpm + notes構造）がインポートされたとき、THE JsonConverter SHALL 旧形式のデータを単一レイヤーとして変換し、後方互換性を維持する
4. THE JsonConverter SHALL エクスポートJSONに format_version フィールドを含め、レイヤー形式を "2.0" として識別可能にする
5. IF インポートされたJSONにlayers配列が存在しない場合、THEN THE JsonConverter SHALL format_version "1.0"（旧形式）として処理する

### 要件8: JSON Import/Exportのラウンドトリップ整合性

**ユーザーストーリー:** 開発者として、エクスポートしたJSONを再インポートしたとき、レイヤー構成が正確に復元されることを保証したい。これにより、データの損失や破損を防止できる。

#### 受け入れ基準

1. FOR ALL 有効なレイヤー構成に対して、エクスポート→インポート→エクスポートの結果が最初のエクスポート結果と等価である（ラウンドトリッププロパティ）
2. FOR ALL 有効な旧形式JSONに対して、インポート→エクスポートの結果がlayers配列を含む新形式JSONとなり、元のノートデータが保持される
