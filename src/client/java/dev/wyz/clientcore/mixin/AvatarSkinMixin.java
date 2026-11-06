package dev.wyz.clientcore.mixin;

import dev.wyz.clientcore.cosmetic.AppearanceAsset;
import dev.wyz.clientcore.cosmetic.AppearanceAssetCache;
import dev.wyz.clientcore.cosmetic.LocalAppearanceService;
import dev.wyz.clientcore.cosmetic.PlayerAppearance;
import dev.wyz.clientcore.cosmetic.SkinModel;
import net.minecraft.client.Minecraft;

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
 * skins exclusively for the local player using LocalAppearanceService.
 * Does not query or modify remote players.
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
    @Inject(
        method = "extractRenderState(Lnet/minecraft/world/entity/Avatar;Lnet/minecraft/client/renderer/entity/state/AvatarRenderState;F)V",
        at = @At("TAIL")
    )
    private void clientcore$applyDaisySkin(Avatar avatar, AvatarRenderState state, float partialTick, CallbackInfo ci) {
        Minecraft client = Minecraft.getInstance();
        boolean isLocal = (avatar == client.player)
            || (client.player != null && avatar.getId() == client.player.getId())
            || LocalAppearanceService.isLocalPlayer(avatar.getUUID(), avatar.getId(), avatar.getName().getString());
        if (!isLocal) {
            return;
        }

        PlayerAppearance appearance = LocalAppearanceService.getLocalAppearance();
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
//?} elif >=1.21.2 {
/*    @Inject(
        method = "extractRenderState(Lnet/minecraft/client/player/AbstractClientPlayer;Lnet/minecraft/client/renderer/entity/state/PlayerRenderState;F)V",
        at = @At("TAIL")
    )
    private void clientcore$applyDaisySkin(AbstractClientPlayer avatar, PlayerRenderState state, float partialTick, CallbackInfo ci) {
        Minecraft client = Minecraft.getInstance();
        boolean isLocal = (avatar == client.player)
            || (client.player != null && avatar.getId() == client.player.getId())
            || LocalAppearanceService.isLocalPlayer(avatar.getUUID(), avatar.getId(), avatar.getName().getString());
        if (!isLocal) {
            return;
        }

        PlayerAppearance appearance = LocalAppearanceService.getLocalAppearance();
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
*///?} else {
/*    @Inject(method = "getSkin", at = @At("RETURN"), cancellable = true)
    private void clientcore$applyDaisySkin(CallbackInfoReturnable<PlayerSkin> cir) {
        AbstractClientPlayer self = (AbstractClientPlayer) (Object) this;
        Minecraft client = Minecraft.getInstance();
        boolean isLocal = (self == client.player)
            || (client.player != null && self.getId() == client.player.getId())
            || LocalAppearanceService.isLocalPlayer(self.getUUID(), self.getId(), self.getName().getString());
        if (!isLocal) {
            return;
        }

        PlayerAppearance appearance = LocalAppearanceService.getLocalAppearance();
        if (appearance != null && appearance.getSkin() != null) {
            cir.setReturnValue(PlayerAppearance.applyLegacySkin(cir.getReturnValue(), appearance));
        }
    }
*///?}
}
