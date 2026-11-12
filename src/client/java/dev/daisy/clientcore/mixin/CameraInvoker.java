package dev.daisy.clientcore.mixin;

import net.minecraft.client.Camera;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Invoker;

@Mixin(Camera.class)
public interface CameraInvoker {
    @Invoker("setRotation")
    void daisy$setRotation(float yRot, float xRot);

    @Invoker("setPosition")
    void daisy$setPosition(double x, double y, double z);

    @Invoker("move")
    void daisy$move(float zoom, float dy, float dx);

    @Invoker("getMaxZoom")
    float daisy$getMaxZoom(float zoom);
}
