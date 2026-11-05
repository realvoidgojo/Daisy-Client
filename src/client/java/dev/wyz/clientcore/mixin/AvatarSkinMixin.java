package dev.wyz.clientcore.mixin;

import dev.wyz.clientcore.cosmetic.AppearanceAsset;
import dev.wyz.clientcore.cosmetic.AppearanceAssetCache;
import dev.wyz.clientcore.cosmetic.AppearanceRoster;
import dev.wyz.clientcore.cosmetic.PlayerAppearance;
import dev.wyz.clientcore.cosmetic.SkinModel;
import dev.wyz.clientcore.net.AppearanceLookupService;

//? if >=1.21.10 {
import net.minecraft.client.renderer.entity.player.AvatarRenderer;
import net.minecraft.client.renderer.entity.state.AvatarRenderState;
import net.minecraft.world.entity.Avatar;
//?} elif >=1.21.2 {
/*import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.entity.player.PlayerRenderer;
import net.minecraft.client.renderer.entity.state.PlayerRenderState;
*///?} else {
/*import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.resources.PlayerSkin;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;
*///?}

//? if >=1.21.9 {
import net.minecraft.core.ClientAsset;
import net.minecraft.world.entity.player.PlayerModelType;
import net.minecraft.world.entity.player.PlayerSkin;
import java.util.Optional;
//?}

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
//? if >=1.21.2 {
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
//?}

/**
 * Mixin that replaces vanilla/default Steve/Alex skin textures and models with custom Daisy
 * skins from AppearanceRoster, allowing offline players on SMP servers to see each other's custom skins.
 */
//? if >=1.21.10 {
@Mixin(AvatarRenderer.class)
//?} elif >=1.21.2 {
/*@Mixin(PlayerRenderer.class)
*///?} else {
/*@Mixin(AbstractClientPlayer.class)
*///?}
public abstract class AvatarSkinMixin {

//? if >=1.21.10 {
    @Inject(method = "extractCapeState", at = @At("TAIL"))
    private void clientcore$applyDaisySkin(Avatar avatar, AvatarRenderState state, float partialTick, CallbackInfo ci) {
        String name = avatar.getCustomName() != null ? avatar.getCustomName().getString() : null;
        PlayerAppearance appearance = AppearanceLookupService.INSTANCE.getOrQuery(avatar.getUUID(), name);
        if (appearance != null && state.skin != null) {
            AppearanceAsset skinAsset = appearance.getSkin();
            if (skinAsset != null) {
//? if >=1.21.9 {
                ClientAsset.ResourceTexture texture = AppearanceAssetCache.INSTANCE.getOrLoadClientAsset(skinAsset, false);
                if (texture != null) {
                    PlayerModelType model = appearance.getModel() == SkinModel.SLIM ? PlayerModelType.SLIM : PlayerModelType.WIDE;
                    PlayerSkin.Patch patch = PlayerSkin.Patch.create(Optional.of(texture), Optional.empty(), Optional.empty(), Optional.of(model));
                    state.skin = state.skin.with(patch);
                }
//?}
            }

            AppearanceAsset capeAsset = appearance.getCape();
            if (capeAsset != null) {
//? if >=1.21.9 {
                ClientAsset.ResourceTexture capeTexture = AppearanceAssetCache.INSTANCE.getOrLoadClientAsset(capeAsset, true);
                if (capeTexture != null) {
                    state.showCape = true;
                    PlayerSkin.Patch patch = PlayerSkin.Patch.create(Optional.empty(), Optional.of(capeTexture), Optional.empty(), Optional.empty());
                    state.skin = state.skin.with(patch);
                }
//?}
            }
        }
    }
//?}
}

