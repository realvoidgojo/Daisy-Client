package dev.daisy.clientcore.mixin;

import dev.daisy.clientcore.ui.menu.DaisyMainMenu;
import net.minecraft.client.Minecraft;
//? if >=26.1 {
/*import net.minecraft.client.gui.GuiGraphicsExtractor;
*///?} else {
import net.minecraft.client.gui.GuiGraphics;
//?}
import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.client.gui.components.events.GuiEventListener;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.TitleScreen;
//? if >=1.21.9 {
import net.minecraft.client.input.MouseButtonEvent;
//?} else {
/**///?}
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Daisy's clean main menu. Takes over the whole TitleScreen render: cancels vanilla
 * rendering entirely (panorama, Mojang logo, splash, version/copyright strings, and
 * any other-mod menu overlays) and draws Daisy's own menu instead. Vanilla widgets
 * are neutered so only Daisy's immediate-mode buttons handle input.
 */
@Mixin(TitleScreen.class)
public abstract class TitleScreenMixin extends Screen {
    protected TitleScreenMixin(Component title) {
        super(title);
    }

    @Inject(method = "init", at = @At("TAIL"))
    private void clientcore$rollSplash(CallbackInfo ci) {
        DaisyMainMenu.INSTANCE.pickSplash();
    }

//? if >=26.1 {
/*    @Inject(method = "extractRenderState", at = @At("HEAD"), cancellable = true)
*///?} else {
    @Inject(method = "render", at = @At("HEAD"), cancellable = true)
//?}
//? if >=26.1 {
/*    private void clientcore$daisyMenu(GuiGraphicsExtractor g, int mouseX, int mouseY, float partialTick, CallbackInfo ci) {
*///?} else {
    private void clientcore$daisyMenu(GuiGraphics g, int mouseX, int mouseY, float partialTick, CallbackInfo ci) {
//?}
        // Neuter vanilla / other-mod widgets so nothing but Daisy's menu draws or clicks.
        for (GuiEventListener child : this.children()) {
            if (child instanceof AbstractWidget widget) {
                widget.visible = false;
                widget.active = false;
            }
        }
        Minecraft client = Minecraft.getInstance();
        DaisyMainMenu.INSTANCE.renderBackground(client, g);
        DaisyMainMenu.INSTANCE.render((TitleScreen) (Object) this, client, g, mouseX, mouseY);
        ci.cancel();
    }

    @Override
//? if >=1.21.9 {
    public boolean mouseClicked(MouseButtonEvent event, boolean doubled) {
        if (DaisyMainMenu.INSTANCE.mouseClicked((TitleScreen) (Object) this, event.x(), event.y())) {
//?} else {
/*    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (DaisyMainMenu.INSTANCE.mouseClicked((TitleScreen) (Object) this, mouseX, mouseY)) {
*///?}
            return true;
        }
//? if >=1.21.9 {
        return super.mouseClicked(event, doubled);
//?} else {
/*        return super.mouseClicked(mouseX, mouseY, button);
*///?}
    }
}
