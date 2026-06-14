<template>
  <div class="user-header-card">
    <div class="full-cover-bg" :style="{ backgroundImage: `url(${bgImage || defaultCover})` }">
      <div class="glass-mask"></div>
    </div>

    <div class="content-overlay">
      <div class="avatar-wrapper">
        <img :src="avatar || defaultAvatar" class="avatar-main" />
        <div v-if="isCertified" class="cert-badge">认证</div>
      </div>

      <div class="user-info-text">
        <div class="name-row">
          <span class="nickname">{{ nickname }}</span>
        </div>
        <p class="signature">个性签名：{{ signature || '写下你的个人签名' }}</p>
      </div>

      <div class="stats-panel">
        <div class="stat-item"><strong>{{ stats.created }}</strong><span>发布</span></div>
        <div class="divider"></div>
        <div class="stat-item"><strong>{{ stats.voted }}</strong><span>参与</span></div>
        <div class="divider"></div>
        <div class="stat-item"><strong>{{ stats.enterprise }}</strong><span>企业投票</span></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import defaultCover from '../assets/backgroud.PNG'
import defaultAvatar from '../assets/head_portrait.png'

defineProps({
  nickname: String,
  avatar: String,
  bgImage: String,
  signature: String,
  isCertified: Boolean,
  stats: { type: Object, default: () => ({ created: 0, voted: 0, enterprise: 0 }) }
})
</script>

<style scoped>
.user-header-card { position: relative; width: 100%; height: 360px; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; box-shadow: 0 12px 40px rgba(0,0,0,0.12); }
.full-cover-bg { position: absolute; inset: 0; background-size: cover; background-position: center; z-index: 1; transition: background-image 0.3s ease; }
.glass-mask { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.68) 100%); }
.content-overlay { position: relative; z-index: 2; text-align: center; padding-bottom: 30px; color: #fff; }
.avatar-wrapper { position: relative; display: inline-block; margin-bottom: 15px; }
.avatar-main { width: 104px; height: 104px; border-radius: 50%; border: 4px solid rgba(255,255,255,0.45); object-fit: cover; background: #eee; }
.cert-badge { position: absolute; bottom: 5px; right: -4px; background: #67c23a; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 7px; border-radius: 6px; }
.nickname { font-size: 26px; font-weight: 600; text-shadow: 0 2px 10px rgba(0,0,0,0.3); }
.signature { font-size: 14px; opacity: 0.9; margin: 10px 0 24px; }
.stats-panel { display: inline-flex; align-items: center; gap: 36px; background: rgba(255,255,255,0.16); backdrop-filter: blur(10px); padding: 14px 36px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.22); }
.stat-item { display: flex; flex-direction: column; }
.stat-item strong { font-size: 18px; }
.stat-item span { font-size: 12px; opacity: 0.75; }
.divider { width: 1px; height: 25px; background: rgba(255,255,255,0.3); }
</style>
