"""Unit tests for the modules that need no Blender (metrics.py, skeleton.py). Run: python3 metrics_test.py"""
import unittest

from metrics import aabb_gap, allowed, apply_rules, fade, foot_slide, loop_difference, size_error, stretch, triangle_count
from skeleton import bones_from, in_region, nearest_bone, part_of

BOX = ((0, 0, 0), (1, 1, 1))
ARM_RULES = [{"part": "torso", "deny": ["*Arm*", "*Hand*"]}, {"part": "hand_*", "only": ["*Hand"]}]


class Assembly(unittest.TestCase):
    def test_gap_is_zero_when_parts_overlap(self):
        self.assertEqual(aabb_gap(BOX, ((0.5, 0.5, 0.5), (2, 2, 2))), 0)

    def test_gap_is_zero_when_parts_touch(self):
        self.assertEqual(aabb_gap(BOX, ((1, 0, 0), (2, 1, 1))), 0)

    def test_gap_is_the_distance_when_a_part_floats(self):
        self.assertAlmostEqual(aabb_gap(BOX, ((1.02, 0, 0), (2, 1, 1))), 0.02)

    def test_gap_measures_across_a_corner(self):
        self.assertAlmostEqual(aabb_gap(BOX, ((4, 5, 0), (5, 6, 1))), 5.0)

    def test_size_error_is_the_worst_axis(self):
        self.assertAlmostEqual(size_error((0.1, 0.2, 0.7), (0.1, 0.23, 0.69)), 0.03)

    def test_triangle_count_splits_quads_and_ngons(self):
        self.assertEqual(triangle_count([3, 4, 5]), 6)


class Stretch(unittest.TestCase):
    def test_stretch_reports_the_worst_edge_and_where(self):
        worst, index, _ = stretch([1, 1, 2], [1, 4, 2])
        self.assertEqual((worst, index), (4, 1))

    def test_stretch_of_an_unmoved_mesh_is_one(self):
        self.assertEqual(stretch([0.5, 0.2], [0.5, 0.2])[0], 1)

    def test_stretch_ignores_zero_length_edges(self):
        self.assertEqual(stretch([0, 1], [3, 1])[0], 1)


class Clips(unittest.TestCase):
    def test_a_planted_foot_that_stays_put_does_not_slide(self):
        self.assertEqual(foot_slide([(0, 0, 0), (0, 0, 0), (0, 0, 0)]), 0)

    def test_a_planted_foot_that_moves_slides_by_that_distance(self):
        self.assertAlmostEqual(foot_slide([(0, 0, 0), (0.03, 0.04, 0)]), 0.05)

    def test_a_lifted_foot_is_not_counted(self):
        self.assertEqual(foot_slide([(0, 0, 0.2), (0.5, 0, 0.2)]), 0)

    def test_walking_on_the_spot_does_not_slide_when_the_foot_moves_back_at_the_game_speed(self):
        frames = [(0, i * 1.5 / 30, 0) for i in range(5)]  # facing -Y, so a planted foot travels +Y
        self.assertAlmostEqual(foot_slide(frames, speed=1.5, fps=30), 0)

    def test_loop_difference_is_the_largest_change_between_first_and_last_frame(self):
        self.assertAlmostEqual(loop_difference([0, 1, 2], [0, 1.2, 1.9]), 0.2)


class WeightRules(unittest.TestCase):
    def test_rule_gives_torso_no_weight_on_arm_bones(self):
        result = apply_rules({"Spine": 0.5, "LeftArm": 0.5}, "torso", ARM_RULES)
        self.assertEqual(result, {"Spine": 1.0})

    def test_only_rule_puts_a_hand_fully_on_its_hand_bone(self):
        result = apply_rules({"LeftHand": 0.3, "LeftForeArm": 0.6, "Spine": 0.1}, "hand_L", ARM_RULES)
        self.assertEqual(result, {"LeftHand": 1.0})

    def test_a_part_with_no_rule_keeps_its_weights(self):
        self.assertEqual(apply_rules({"Hips": 0.25, "LeftUpLeg": 0.75}, "leg_L", ARM_RULES), {"Hips": 0.25, "LeftUpLeg": 0.75})

    def test_weights_are_cut_to_the_strongest_four_and_add_up_to_one(self):
        result = apply_rules({"a": 0.4, "b": 0.3, "c": 0.15, "d": 0.1, "e": 0.05}, "leg_L", [])
        self.assertEqual(sorted(result), ["a", "b", "c", "d"])
        self.assertAlmostEqual(sum(result.values()), 1.0)

    def test_a_vertex_left_with_no_allowed_bone_goes_to_the_fallback(self):
        self.assertEqual(apply_rules({"LeftArm": 1.0}, "torso", ARM_RULES, fallback="Spine"), {"Spine": 1.0})

    def test_a_rule_does_nothing_on_the_border_of_a_part_and_everything_deep_inside_it(self):
        self.assertEqual((fade(0, 0.04), fade(0.04, 0.04), fade(0.1, 0.04)), (0, 1, 1))
        self.assertAlmostEqual(fade(0.02, 0.04), 0.5)

    def test_at_half_strength_a_forbidden_bone_keeps_half_its_weight_before_scaling(self):
        result = apply_rules({"Spine": 0.5, "LeftArm": 0.5}, "torso", ARM_RULES, strength=0.5)
        self.assertAlmostEqual(result["LeftArm"], 1 / 3)
        self.assertAlmostEqual(result["Spine"], 2 / 3)

    def test_at_zero_strength_the_weights_are_unchanged(self):
        self.assertEqual(apply_rules({"Spine": 0.5, "LeftArm": 0.5}, "torso", ARM_RULES, strength=0), {"Spine": 0.5, "LeftArm": 0.5})

    def test_patterns_are_case_sensitive(self):
        self.assertTrue(allowed("torso", "leftarm", ARM_RULES))
        self.assertFalse(allowed("torso", "LeftArm", ARM_RULES))


JOINTS = {"joints": {"hips": [0, 0, 0.58], "spine": [0, 0, 0.68], "chest": [0, 0, 0.8], "neck": [0, 0, 0.93], "head": [0, 0, 0.98],
                     "head_top": [0, 0, 1.15], "shoulder_L": [0.11, 0, 0.9], "elbow_L": [0.25, 0, 0.74], "wrist_L": [0.37, 0, 0.6],
                     "hand_L": [0.42, 0, 0.54], "hip_L": [0.07, 0, 0.55], "knee_L": [0.08, 0, 0.3], "ankle_L": [0.08, 0, 0.06],
                     "toe_L": [0.08, -0.12, 0.02]}}


class Skeleton(unittest.TestCase):
    def test_a_biped_gets_mixamo_bone_names_with_parents_first(self):
        names = [b["name"] for b in bones_from(JOINTS)]
        self.assertEqual(names[:5], ["Hips", "Spine", "Spine2", "Neck", "Head"])
        self.assertIn("LeftForeArm", names)
        self.assertLess(names.index("LeftArm"), names.index("LeftForeArm"))

    def test_missing_right_side_joints_are_mirrored_from_the_left(self):
        right = next(b for b in bones_from(JOINTS) if b["name"] == "RightArm")
        self.assertEqual(right["head"], [-0.11, 0, 0.9])

    def test_extra_bones_are_added_after_the_body(self):
        spec = dict(JOINTS, extra_bones=[{"name": "ClothFront", "head": [0, -0.1, 0.5], "tail": [0, -0.1, 0.3], "parent": "Hips"}])
        self.assertEqual(bones_from(spec)[-1]["name"], "ClothFront")

    def test_a_bone_list_is_used_as_given_for_anything_that_is_not_a_biped(self):
        spec = {"bones": [{"name": "Tail", "head": [0, 0.4, 0.3], "tail": [0, 0.7, 0.3], "parent": None}]}
        self.assertEqual([b["name"] for b in bones_from(spec)], ["Tail"])

    def test_bones_map_to_body_parts(self):
        self.assertEqual([part_of(b) for b in ("Head", "Spine2", "LeftForeArm", "RightHand", "LeftUpLeg", "ClothFront")],
                         ["head", "torso", "arm_L", "hand_R", "leg_L", "clothfront"])

    def test_a_point_is_tagged_with_the_bone_it_is_nearest_to(self):
        self.assertEqual(nearest_bone([0.31, 0, 0.67], bones_from(JOINTS)), "LeftForeArm")

    def test_cloth_beside_an_arm_but_out_of_its_reach_goes_to_the_body(self):
        beside_the_forearm = [0.3, 0.09, 0.67]  # 9 cm from the forearm bone: nearer to it than to the spine
        self.assertEqual(nearest_bone(beside_the_forearm, bones_from(JOINTS)), "LeftForeArm")
        self.assertNotIn("Arm", nearest_bone(beside_the_forearm, bones_from(JOINTS), {"arm_*": 0.06, "hand_*": 0.07}))

    def test_a_sleeve_within_reach_stays_with_the_arm(self):
        self.assertEqual(nearest_bone([0.31, 0.03, 0.67], bones_from(JOINTS), {"arm_*": 0.06}), "LeftForeArm")

    def test_a_region_claims_points_inside_it_from_the_listed_parts_only(self):
        coat = {"name": "coat", "z": [0.3, 0.62], "from": ["torso", "leg_*"]}
        self.assertTrue(in_region([0.1, 0, 0.5], "leg_L", coat))
        self.assertFalse(in_region([0.3, 0, 0.5], "hand_L", coat))
        self.assertFalse(in_region([0.1, 0, 0.7], "torso", coat))


if __name__ == "__main__":
    unittest.main()
