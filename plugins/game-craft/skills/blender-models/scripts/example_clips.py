"""Worked example: clips written as code, on the rig they will play on.

    blender -b --python example_clips.py -- model.blend

Writes two looping actions on a biped with Mixamo bone names, at 30 frames a second:
  idle  2 s: breathing and a small turn of the head, feet still
  walk  1 s: exactly two footsteps, walking on the spot
Every frame starts from the rest pose and the last frame repeats the first, so the loops close.

The walk is built from where the feet must be, not from joint angles. A planted foot travels straight
back along the floor at a constant speed; a lifted foot follows an arc back to the front; the hips ride
over the planted leg at the height an almost straight leg allows. The thigh and knee angles are then
solved from the foot's position (two bones in a plane, by the law of cosines) and the foot is turned back
level. That holds for long legs and for short stocky ones, where a hand-tuned knee curve scuffs the
floor. Cloth bones named ClothFront and ClothBack swing with the thighs so a skirt or tabard is pushed
by the leg instead of being walked through. The script prints the speed the game must move the character
at for the feet not to slide. Copy the pattern: decide where things must be, solve the joints, set a limit
on every joint, then run check_clips.py for the numbers.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy

import common
from pose_test import BACK, UP, move, rest

FPS = 30
ACROSS = (1, 0, 0)        # turning a hanging leg about +x swings it backward
STRIDE_ANGLE = 22.0       # degrees the planted leg reaches forward and back
STRAIGHT = 0.995          # how straight the planted leg is: 1 locks the knee
LIFT = 0.13               # how high the swinging foot rises, as a share of the leg's length
LIMITS = {"Head": 70, "Spine": 30, "Spine2": 30, "LeftLeg": 150, "RightLeg": 150}  # degrees a joint may turn in one move


def clamp(step):
    limit = LIMITS.get(step["bone"], 120)
    return {**step, "degrees": max(-limit, min(limit, step["degrees"]))}


def leg(rig):
    """Thigh length, shin length and the hip's height above the ankle, at rest."""
    hip, knee, ankle = (rig.pose.bones[name].head for name in ("LeftUpLeg", "LeftLeg", "LeftFoot"))
    return (hip - knee).length, (knee - ankle).length, hip.z - ankle.z


def solve_leg(thigh, shin, ahead, down):
    """Angles that put the ankle `ahead` of and `down` from the hip: (thigh forward, knee bend), in degrees."""
    reach = min(math.hypot(ahead, down), (thigh + shin) * 0.9995)
    cosine = lambda value: math.acos(max(-1.0, min(1.0, value)))
    bend = math.pi - cosine((thigh * thigh + shin * shin - reach * reach) / (2 * thigh * shin))
    forward = math.atan2(ahead, down) + cosine((thigh * thigh + reach * reach - shin * shin) / (2 * thigh * reach))
    return math.degrees(forward), math.degrees(bend)


def walk_speed(rig):
    """Metres a second the game must move the character for this walk's feet to stay put."""
    thigh, shin, _ = leg(rig)
    return 4 * (thigh + shin) * STRAIGHT * math.sin(math.radians(STRIDE_ANGLE))  # two strides of 2 x reach, in 1 s


def walk_for(rig):
    thigh, shin, rest_height = leg(rig)
    length = (thigh + shin) * STRAIGHT
    reach = length * math.sin(math.radians(STRIDE_ANGLE))
    cloth = [name for name in ("ClothFront", "ClothBack") if name in rig.pose.bones]

    def walk(t):
        phases = {"Left": t % 1, "Right": (t + 0.5) % 1}
        planted_ahead = next(reach * (1 - 4 * phase) for phase in phases.values() if phase < 0.5)
        hip_height = math.sqrt(length * length - planted_ahead * planted_ahead)  # the hips ride over the planted leg
        moves, thighs = [], {}
        for side, phase in phases.items():
            if phase < 0.5:   # planted: from `reach` ahead to `reach` behind, at a constant speed, on the floor
                ahead, down = reach * (1 - 4 * phase), hip_height
            else:             # lifted: back to the front along an arc, eased at both ends
                swing = (phase - 0.5) * 2
                ahead = reach * (-1 + 2 * (0.5 - 0.5 * math.cos(swing * math.pi)))
                down = hip_height - LIFT * length * math.sin(swing * math.pi) ** 0.6
            forward, bend = solve_leg(thigh, shin, ahead, down)
            thighs[side] = forward
            moves += [{"bone": f"{side}UpLeg", "about": ACROSS, "degrees": -forward}, {"bone": f"{side}Leg", "about": ACROSS, "degrees": bend},
                      {"bone": f"{side}Foot", "about": ACROSS, "degrees": forward - bend}]  # turn the foot back level
        moves += [{"bone": "LeftArm", "about": ACROSS, "degrees": -thighs["Right"] * 0.6},   # arms swing against the legs
                  {"bone": "RightArm", "about": ACROSS, "degrees": -thighs["Left"] * 0.6},
                  {"bone": "Spine", "about": UP, "degrees": math.sin(t * math.tau) * 4}]
        if "ClothFront" in cloth:  # the leading thigh pushes the front cloth, the trailing one the back
            moves.append({"bone": "ClothFront", "about": ACROSS, "degrees": -max(0.0, *thighs.values()) * 0.85})
        if "ClothBack" in cloth:
            moves.append({"bone": "ClothBack", "about": ACROSS, "degrees": -min(0.0, *thighs.values()) * 0.85})
        return moves, hip_height - rest_height

    return walk


def idle(t):
    breathe = math.sin(t * math.tau)
    return [{"bone": "Spine2", "toward": BACK, "degrees": 1.5 + breathe * 1.5}, {"bone": "Head", "about": UP, "degrees": breathe * 4},
            {"bone": "LeftArm", "about": ACROSS, "degrees": breathe * 2}, {"bone": "RightArm", "about": ACROSS, "degrees": -breathe * 2}], 0.0


def write(rig, name, frames, pose_at):
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = action
    for bone in rig.pose.bones:
        bone.rotation_mode = "QUATERNION"
    for frame in range(frames + 1):  # frame `frames` repeats frame 0, so the loop closes
        rest(rig)
        moves, hip_offset = pose_at((frame % frames) / frames)
        for step in moves:
            move(rig, clamp(step))
        hips = rig.pose.bones.get("Hips")
        if hips:
            hips.location.y += hip_offset  # a bone's own y axis runs along its length: up, for the hips
        for bone in rig.pose.bones:
            bone.keyframe_insert("rotation_quaternion", frame=frame + 1)
        if hips:
            hips.keyframe_insert("location", frame=frame + 1)
    rest(rig)
    return action


def main(argv):
    common.load(argv[0])
    rig = common.armature()
    bpy.context.scene.render.fps = FPS
    rest(rig)
    speed = round(walk_speed(rig), 3)
    names = [write(rig, "idle", 2 * FPS, idle).name, write(rig, "walk", FPS, walk_for(rig)).name]
    rig.animation_data.action = None
    common.save(argv[0])
    print(f"clips: {names}; move the character at {speed} m/s while walk plays")
    return {"clips": names, "walk_speed": speed}


if __name__ == "__main__":
    main(common.args())
