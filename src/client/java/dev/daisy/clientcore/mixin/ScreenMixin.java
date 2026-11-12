package dev.daisy.clientcore.mixin;

import dev.daisy.clientcore.DaisyRuntime;
import net.minecraft.client.Minecraft;
//? if >=26.1 {
/*import net.minecraft.client.gui.GuiGraphicsExtractor;
*///?} else {
import net.minecraft.client.gui.GuiGraphics;
//?}
import net.minecraft.client.gui.screens.Screen;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(Screen.class)
public abstract class ScreenMixin {
//? if >=26.1 {
/*    @Inject(method = "extractRenderState", at = @At("TAIL"))
*///?} else {
    @Inject(method = "render", at = @At("TAIL"))
//?}
//? if >=26.1 {
/*    private void clientcore$daisyRenderWatermark(GuiGraphicsExtractor guiGraphics, int mouseX, int mouseY, float partialTick, CallbackInfo ci) {
*///?} else {
    private void clientcore$daisyRenderWatermark(GuiGraphics guiGraphics, int mouseX, int mouseY, float partialTick, CallbackInfo ci) {
//?}
        Minecraft client = Minecraft.getInstance();
        DaisyRuntime.INSTANCE.renderScreen(client, (Screen) (Object) this, guiGraphics, mouseX, mouseY, partialTick);
    }
}
